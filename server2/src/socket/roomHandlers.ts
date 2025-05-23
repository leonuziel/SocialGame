// src/socket/roomHandlers.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Room, Player, Game, GameState } from '../data/models'; // Import data structures
import * as store from '../data/store'; // Import store functions for state manipulation
import { GameType } from '../Games/GameUtils'; // Added import

// --- Callback Type Definitions ---
// Provides type safety for callback functions passed from the client.
type Callback<T> = (response: T) => void;
type BasicCallback = Callback<{ success: boolean; message: string }>; // For simple success/failure acknowledgements
type RoomCallback = Callback<{ success: boolean; message: string; room?: Room }>; // For actions returning room data

/**
 * Handles a client's request to join or automatically create a room.
 * If the room exists, attempts to join. If not, creates it and makes the user the admin.
 * Performs validation checks (room full, game state, etc.).
 * Updates game state if player count triggers 'ready' or 'waiting to start'.
 *
 * @param io - The Socket.IO server instance.
 * @param socket - The socket instance of the player joining/creating.
 * @param data - Object containing { roomId: string, username?: string, maxPlayers?: number }.
 * @param callback - Optional callback function for acknowledging the result to the sender.
 */
export const handleJoinRoom = (
    io: SocketIOServer,
    socket: Socket,
    data: { roomId: string, username?: string, maxPlayers?: number },
    callback?: RoomCallback
) => {
    const { roomId, username, maxPlayers } = data; // Extract data
    let room = store.getRoom(roomId); // Check if room already exists in the store

    if (room) {
        // --- ROOM EXISTS - JOIN LOGIC ---
        console.log(`[Room] Room ${roomId} exists. Attempting join for ${socket.id}`);

        // 1. Check if player is already in the room
        if (room.players.some(player => player.id === socket.id)) {
            console.log(`[Room] User ${socket.id} is already in room: ${roomId}. Re-syncing.`);
            // Ensure they are in the socket.io room channel (in case of server restart/glitch)
            socket.join(roomId);
            // Re-send current room state to the client
            socket.emit('joinedRoom', room);
            if (callback) callback({ success: true, message: `You are already in room "${roomId}".`, room });
            return;
        }

        // 2. Check if room is full
        if (room.players.length >= room.game.maxPlayers) {
            console.warn(`[Room] User ${socket.id} attempted to join full room: ${roomId}`);
            if (callback) callback({ success: false, message: `Room "${roomId}" is full (${room.game.maxPlayers} players max).` });
            return;
        }

        // 3. Check game state (prevent joining if 'in game' or 'concluded')
        if (room.game.state === 'in game' || room.game.state === 'concluded') {
            console.warn(`[Room] User ${socket.id} attempted to join room ${roomId} but game state is ${room.game.state}`);
            if (callback) callback({ success: false, message: `Cannot join room "${roomId}", game is ${room.game.state}.` });
            return;
        }

        // 4. Add player to existing room
        console.log(`[Room] User ${socket.id} joining existing room: ${roomId}`);
        const newPlayer = store.createNewPlayer(socket.id, username);
        const updatedRoom = store.addPlayerToRoom(roomId, newPlayer); // Add player via store function

        if (updatedRoom) {
            socket.join(roomId); // Join the Socket.IO broadcast channel for the room

            // 5. Notify other players in the room
            socket.to(roomId).emit('playerJoined', { roomId, newPlayer });

            // 6. Check if player count triggers a state change ('waiting to start' <-> 'ready')
            const newState = store.checkAndSetReadyState(updatedRoom);
            if (newState) {
                // If state changed, notify everyone (including the joiner)
                io.to(roomId).emit('gameStateChanged', { roomId, newState });
            }

            // 7. Send confirmation and full room state back to the joiner
            socket.emit('joinedRoom', updatedRoom);
            if (callback) callback({ success: true, message: `Successfully joined room "${roomId}".`, room: updatedRoom });
            // console.log(`[Room] Current players in room ${roomId}:`, updatedRoom.players.map(p => p.username)); // Optional logging
        } else {
             // This case might occur if addPlayerToRoom fails unexpectedly (e.g., race condition?)
             console.error(`[Room] Failed to add player ${socket.id} to room ${roomId} in store.`);
             if (callback) callback({ success: false, message: `Server error: Failed to add player to room.` });
        }

    } else {
        // --- ROOM DOES NOT EXIST - CREATE AND JOIN LOGIC ---
        console.log(`[Room] Room ${roomId} does not exist. Creating and joining for ${socket.id}`);

        // 1. Create player and game objects
        const creatorPlayer = store.createNewPlayer(socket.id, username);
        // Create game, potentially using maxPlayers suggested by client or default
        const newGame = store.createNewGame(GameType.None, maxPlayers); // Modified line

        // 2. Create the new Room object, assigning the creator as the admin
        const newRoom: Room = {
            roomId: roomId,
            players: [creatorPlayer], // Creator is the first player
            game: newGame,
            adminId: creatorPlayer.id, // Creator is the admin
        };

        // 3. Join Socket.IO channel and add room to store
        socket.join(roomId);
        store.addRoom(newRoom);

        // 4. Check initial state (only relevant if minPlayers could be 1)
        const initialState = store.checkAndSetReadyState(newRoom);
        if (initialState) { // Should normally be 'waiting to start' here if minPlayers >= 2
             socket.emit('gameStateChanged', { roomId, newState: initialState });
        }

        // 5. Acknowledge creation and joining by sending the full room state
        socket.emit('joinedRoom', newRoom);
        if (callback) callback({ success: true, message: `Room "${roomId}" created and joined successfully.`, room: newRoom });
        console.log(`[Room] Room ${roomId} created by ${socket.id}. Admin: ${newRoom.adminId}`);
    }
};

/**
 * Handles a client's request to leave a room.
 * Removes the player, updates admin if necessary, checks for state changes,
 * and deletes the room if empty.
 *
 * @param io - The Socket.IO server instance.
 * @param socket - The socket instance of the player leaving.
 * @param roomId - The ID of the room to leave.
 * @param callback - Optional callback for acknowledgement.
 * @param isDisconnect - Internal flag to indicate if leave is due to disconnect (suppresses some logs/callbacks).
 */
export const handleLeaveRoom = (
    io: SocketIOServer,
    socket: Socket,
    roomId: string,
    callback?: BasicCallback,
    isDisconnect: boolean = false // Flag to know if triggered by disconnect event
) => {
    // Get room state *before* potentially removing the player (useful for logic checks)
    const roomBeforeLeave = store.getRoom(roomId);
    const initialRoomState = roomBeforeLeave?.game.state;

    // 1. Attempt to remove the player from the store
    const { room, playerLeft } = store.removePlayerFromRoom(roomId, socket.id);

    // 2. Handle cases where player or room wasn't found
    if (!room || !playerLeft) {
        // If not a disconnect, it's an explicit leave attempt for a room they aren't in
        if (!isDisconnect) {
            console.warn(`[Room] User ${socket.id} attempted to leave room ${roomId} but was not found.`);
            if (callback) callback({ success: false, message: `You are not in room "${roomId}" or room does not exist.` });
        } // If it IS a disconnect, we might have already cleaned up, so don't error spam
        return;
    }

    // --- Player successfully found and removed from store's player list ---
    console.log(`[Room] Player ${playerLeft.username} (${socket.id}) leaving room: ${roomId}`);

    // 3. Leave the Socket.IO broadcast channel
    socket.leave(roomId);

    // 4. Notify remaining players
    // socket.to(roomId).emit(...) // Equivalent to io.to(roomId).emit(...) when sender already left channel
    io.to(roomId).emit('playerLeft', { roomId, playerId: playerLeft.id });

    // 5. Handle game state changes triggered by player leaving
    let roomStillExists = true;
    if (room.players.length === 0) {
        // 5a. Delete room if empty
        store.deleteRoom(roomId);
        roomStillExists = false;
        console.log(`[Room] Room ${roomId} is now empty and has been deleted.`);
    } else {
        // 5b. Check if the Admin left and assign a new one
        if (room.adminId === playerLeft.id) {
            const newAdmin = room.players[0]; // Simple: Assign the next player in the list
            room.adminId = newAdmin.id; // Update adminId in the existing room object reference
            console.log(`[Room] Admin left room ${roomId}. New admin assigned: ${newAdmin.username} (${newAdmin.id})`);
            // Notify room members about the new admin
            io.to(roomId).emit('newAdmin', { roomId, newAdminId: newAdmin.id, newAdminUsername: newAdmin.username });
        }
    }

    // 6. Check for game state changes (e.g., reverting from 'ready', pausing 'in game')
    if (roomStillExists) {
        // 6a. Check if player count dropped below minimum required for 'ready'
        const newState = store.checkAndSetReadyState(room); // Check state *after* player removal
        if (newState) {
            io.to(roomId).emit('gameStateChanged', { roomId, newState });
        }

        // 6b. Handle if player left while game was 'in game'
         if (initialRoomState === 'in game') {
             console.warn(`[Game] Player left mid-game in ${roomId}. Game might need pausing or concluding.`);
             // --- Add specific game logic here ---
             // Example: Pause the game
             // const updated = store.updateGameState(roomId, { state: 'paused' });
             // if (updated) io.to(roomId).emit('gameStateChanged', { roomId, newState: 'paused' });

             // Example: Conclude the game if too few players remain
             // if (room.players.length < room.game.minPlayers) {
             //    console.log(`[Game] Concluding game in ${roomId} due to insufficient players.`);
             //    gameHandlers.handleConcludeGame(io, roomId); // Call conclude handler (needs import)
             // }
         }
    }

    // 7. Send confirmation back to the leaving client (unless they disconnected)
    if (!isDisconnect) {
        socket.emit('leftRoom', roomId);
    }
    // 8. Acknowledge via callback if provided
    if (callback) callback({ success: true, message: `Successfully left room "${roomId}".` });
};

/**
 * Handles cleanup when a socket disconnects unexpectedly.
 * Finds all rooms the player was in and triggers the leave room logic for each.
 *
 * @param io - The Socket.IO server instance.
 * @param socket - The socket instance that disconnected.
 */
export const handleDisconnect = (io: SocketIOServer, socket: Socket) => {
     console.log(`[Room] Handling disconnect clean-up for: ${socket.id}`);
     // Find all rooms the disconnected user might have been in
     const roomsToLeave = store.findRoomsBySocketId(socket.id);

     if (roomsToLeave.length > 0) {
         console.log(`[Room] User ${socket.id} was in rooms: ${roomsToLeave.map(r => r.roomId).join(', ')}. Triggering leave logic.`);
         roomsToLeave.forEach(room => {
             // Call handleLeaveRoom with the disconnect flag set to true
             handleLeaveRoom(io, socket, room.roomId, undefined, true);
         });
     } else {
         console.log(`[Room] Disconnected user ${socket.id} was not found in any active rooms.`);
     }
};