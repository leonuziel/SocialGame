// src/socket/gameHandlers.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Room, Player, Game, GameState } from '../data/models'; // Import interfaces/types
import * as store from '../data/store'; // Import store functions to interact with state
import { GameType } from '../Games/GameUtils'; // Added import
import { IGame, PlayerActionPayload, GameInitializationOptions } from '../Games/IGame'; // Added import

// --- Callback Type Definitions ---
// Define types for callback functions passed from the client for better type safety
type Callback<T> = (response: T) => void;
type BasicCallback = Callback<{ success: boolean; message: string }>;
type GameCallback = Callback<{ success: boolean; message: string; game?: Game }>; // Used for actions returning game state

/**
 * Handles receiving a chat message from a player and broadcasting it to the room.
 * @param io - The Socket.IO server instance.
 * @param socket - The socket instance of the player sending the message.
 * @param data - Object containing { roomId: string, message: string }.
 */
export const handleSendMessage = (
    io: SocketIOServer,
    socket: Socket,
    data: { roomId: string; message: string }
) => {
    const { roomId, message } = data;
    // Validate message content (basic example: non-empty)
    if (!message || message.trim().length === 0) {
        console.warn(`User ${socket.id} tried to send an empty message to room ${roomId}.`);
        // Optionally send an error back to the sender
        // socket.emit('error', { message: 'Cannot send an empty message.' });
        return;
    }
    if (message.length > 500) { // Example length limit
        console.warn(`User ${socket.id} tried to send an overly long message to room ${roomId}.`);
        socket.emit('error', { message: 'Message is too long (max 500 characters).' });
        return;
    }


    const room = store.getRoom(roomId);
    // Find the Player object corresponding to the sending socket within the room
    const sendingPlayer = store.getPlayerInRoom(roomId, socket.id);

    if (room && sendingPlayer) {
        // Check if chat is allowed in the current game state (e.g., maybe not during 'concluded')
        if (room.game.state === 'concluded') {
            socket.emit('error', { message: 'Chat is disabled as the game has concluded.' });
            return;
        }

        console.log(`Player ${sendingPlayer.username} (${socket.id}) sent message in room ${roomId}: ${message}`);
        // Broadcast the message to *everyone* in the room (including the sender)
        io.to(roomId).emit('message', {
            player: sendingPlayer, // Send the Player object (includes id and username)
            message: message.trim() // Send trimmed message
        });
    } else {
        console.warn(`User ${socket.id} tried to send message to room ${roomId} but is not in it or room doesn't exist.`);
        // Optionally send error back to sender
        socket.emit('error', { message: `Cannot send message in room ${roomId}.` });
    }
};

/**
 * Handles the request from the admin to start the game.
 * Checks if the requesting user is the admin and if the game state is 'ready'.
 * If conditions are met, updates the game state to 'in game' and notifies clients.
 * @param io - The Socket.IO server instance.
 * @param socket - The socket instance of the player attempting to start the game.
 * @param roomId - The ID of the room where the game should start.
 * @param callback - Optional callback function to acknowledge success or failure to the sender.
 */
export const handleStartGame = (
    io: SocketIOServer,
    socket: Socket,
    roomId: string,
    callback?: GameCallback // Callback can return the updated game state
) => {
    const room = store.getRoom(roomId);

    // 1. Validation: Check if room exists
    if (!room) {
         console.warn(`Start game attempt failed: Room "${roomId}" not found.`);
         if (callback) callback({ success: false, message: `Room "${roomId}" not found.` });
         return;
    }

    // 2. Authorization: Check if the player is the admin
    if (room.adminId !== socket.id) {
         console.warn(`Start game failed for ${roomId}: Player ${socket.id} is not admin (${room.adminId})`);
         if (callback) callback({ success: false, message: `Only the room admin can start the game.` });
         return;
    }

    // 3. State Check: Check if the game state is 'ready'
    if (room.game.state !== 'ready') {
        const msg = `Game cannot be started. State is "${room.game.state}" (must be "ready").`;
        console.warn(`Start game failed for ${roomId}: ${msg}`);
        if (callback) callback({ success: false, message: msg });
        return;
    }

    // --- If all checks pass, proceed ---
    console.log(`Attempting to start game in room ${roomId} by admin ${socket.id}`);

    // Create and assign the game instance
    const gameOptions: GameInitializationOptions = { maxPlayers: room.game.maxPlayers };
    // For now, assume Toohak is the only game type being started.
    // Later, gameTypeToStart might come from client or room settings.
    const gameTypeToStart = GameType.Toohak;
    const updatedRoom = store.createAndAssignGameInstance(
        roomId,
        gameTypeToStart,
        room.players,
        socket.id, // adminId
        io,
        gameOptions
    );

    if (updatedRoom && updatedRoom.gameInstance) {
        console.log(`Game started successfully in room ${roomId}. State: ${updatedRoom.game.state}, Type: ${updatedRoom.game.gameType}`);
        // Notify Clients: Inform everyone in the room that the game state has changed (and what type of game it is)
        io.to(roomId).emit('gameStateChanged', {
            roomId,
            newState: updatedRoom.game.state,
            gameType: updatedRoom.game.gameType
        });
        // Optionally, you could also emit the initial game data from updatedRoom.gameInstance.gameData if needed by clients immediately.
        // For Toohak, the first question is usually sent by a separate action after this.

        if (callback) callback({ success: true, message: `Game started in room "${roomId}".`, game: updatedRoom.game });
    } else {
        console.error(`[Critical] Failed to create or assign Toohak game for room ${roomId}`);
        if (callback) callback({ success: false, message: `Failed to initialize the game on the server.` });
    }
};

/**
 * Example handler to manually conclude a game.
 * In a real game, this might be triggered by game logic detecting a win condition or timeout.
 * @param io - The Socket.IO server instance.
 * @param roomId - The ID of the room where the game should be concluded.
 */
export const handleConcludeGame = (
    io: SocketIOServer,
    roomId: string
    // Consider adding parameters like winnerInfo, finalScores etc.
) => {
     const room = store.getRoom(roomId);

     // Only conclude if the game is actually in progress
     if (room && room.game.state === 'in game') {
        // Optional: Call concludeGame on the game instance itself for specific cleanup
        if (room.gameInstance) {
            console.log(`[Game] Calling concludeGame() on instance for room ${roomId}`);
            room.gameInstance.concludeGame("Concluded by server action");
        }

         console.log(`Concluding game in room ${roomId}.`);
         // Update state to 'concluded'
         const updatedRoom = store.updateGameState(roomId, { state: 'concluded' });

         if (updatedRoom) {
              // Notify clients about the conclusion
              io.to(roomId).emit('gameStateChanged', { roomId, newState: 'concluded' });
              // Optionally emit a specific event with final results
              // io.to(roomId).emit('gameConcluded', { roomId, /* winnerInfo, finalScores */ });
              console.log(`Game concluded successfully in room ${roomId}.`);
         } else {
              console.error(`[Critical] Failed to update game state to 'concluded' for existing room ${roomId}`);
         }
     } else {
          console.warn(`Attempted to conclude game for room ${roomId}, but state was not 'in game' or room not found.`);
     }
};

// -----------------------------------------------------------------------------
// Generic Game Action Handler
// -----------------------------------------------------------------------------

export const handleGameAction = async ( // Mark async if gameInstance.handlePlayerAction is async
    io: SocketIOServer,
    socket: Socket,
    data: PlayerActionPayload & { roomId: string }, // Combined type
    callback?: BasicCallback
) => {
    const { roomId, actionType, ...actionPayload } = data; // Separate roomId and actionType

    const room = store.getRoom(roomId);

    if (!room || !room.gameInstance) {
        if (callback) callback({ success: false, message: "Game not found or not initialized." });
        return;
    }

    if (room.game.state !== 'in game') {
        if (callback) callback({ success: false, message: `Game is not currently in progress. State: ${room.game.state}` });
        return;
    }

    // Reconstruct the action payload without roomId for the game instance
    const gameSpecificAction: PlayerActionPayload = { actionType, ...actionPayload };

    try {
        const result = await room.gameInstance.handlePlayerAction(socket.id, gameSpecificAction);
        if (callback) callback(result); // Pass game's result to client's callback
    } catch (error: any) {
        console.error(`[GameAction] Error in game ${room.gameInstance.gameType} for room ${roomId}, action ${actionType}:`, error);
        if (callback) callback({ success: false, message: error.message || "An error occurred in the game." });
    }
};

// Removed handleSubmitAnswer and handleStartToohakQuestionCycle

/*
export const handlePlayerAction = (
    io: SocketIOServer,
    socket: Socket,
    data: { roomId: string; actionType: string; payload: any },
    callback?: BasicCallback
) => {
    const { roomId, actionType, payload } = data;
    const room = store.getRoom(roomId);
    const player = store.getPlayerInRoom(roomId, socket.id);

    // 1. Validations
    if (!room || !player) {
        if (callback) callback({ success: false, message: "Room or player not found." });
        return;
    }
    if (room.game.state !== 'in game') {
        if (callback) callback({ success: false, message: `Game is not currently in progress (state: ${room.game.state}).` });
        return;
    }
    // Add turn validation: Check if it's this player's turn
    // if (room.game.currentTurnPlayerId !== player.id) { ... }

    console.log(`Player ${player.username} performed action '${actionType}' in room ${roomId}`);

    // 2. Process Action (Example: Update score)
    try {
        // --- Your Game Logic Would Go Here ---
        // switch (actionType) {
        //     case 'submitAnswer':
        //         const isCorrect = checkAnswer(payload); // Your game function
        //         if (isCorrect) {
        //             store.incrementPlayerScore(roomId, player.id, 10); // Example store function needed
        //             io.to(roomId).emit('scoreUpdated', { playerId: player.id, newScore: ... });
        //         }
        //         break;
        //     case 'drawCard':
        //         // ... handle drawing card ...
        //         break;
        //     // ... other actions ...
        // }

        // 3. Check for Game End Condition
        // const winner = checkForWinner(room); // Your game function
        // if (winner) {
        //     handleConcludeGame(io, roomId, winner);
        // } else {
        //     // 4. Set Next Turn (if applicable)
        //     const nextPlayerId = determineNextPlayer(room); // Your game function
        //     store.updateGameState(roomId, { currentTurnPlayerId: nextPlayerId });
        //     io.to(roomId).emit('nextTurn', { nextPlayerId });
        // }

        if (callback) callback({ success: true, message: "Action processed." });

    } catch (error) {
        console.error(`Error processing action '${actionType}' in room ${roomId}:`, error);
        if (callback) callback({ success: false, message: "Failed to process action on server." });
    }
};
*/