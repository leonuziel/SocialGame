// src/data/store.ts
import { Room, Player, Game, GameState } from './models';
import { MAX_PLAYERS_DEFAULT, MIN_PLAYERS_DEFAULT } from '../config'; // Import defaults from config
import { ToohakGame } from '../Games/Toohak';
import { GameType } from '../Games/GameUtils'; // Ensure this is imported
import { Server as SocketIOServer } from 'socket.io'; // Needed for ToohakGame constructor
import { IGame, GameInitializationOptions } from '../Games/IGame'; // Added

// --- In-memory Store ---
// The main data structure holding all active rooms, keyed by roomId.
const activeRooms = new Map<string, Room>();

// --- Constants ---
// Minimum players needed to automatically reach the 'ready' state (can be overridden by config)
const MIN_PLAYERS_TO_BE_READY = MIN_PLAYERS_DEFAULT;

// --- Helper Functions ---

/**
 * Creates a new Game object with default values.
 * @param maxPlayers - Maximum players for this game instance. Defaults to MAX_PLAYERS_DEFAULT from config.
 * @returns A new Game object.
 */
export const createNewGame = (gameType: GameType, maxPlayers: number = MAX_PLAYERS_DEFAULT): Game => ({
    gameType: gameType, // Set the game type
    state: "waiting to start",
    maxPlayers: Math.max(MIN_PLAYERS_TO_BE_READY, maxPlayers),
    minPlayers: MIN_PLAYERS_TO_BE_READY,
    currentRound: 0,
    // Initialize other generic fields from models.ts Game interface
    playerScores: {},
    playerAnswerStatuses: {},
});

/**
 * Creates a new Player object.
 * @param socketId - The unique socket ID of the player.
 * @param username - The chosen username. Defaults to a generic name if not provided.
 * @returns A new Player object.
 */
export const createNewPlayer = (socketId: string, username?: string): Player => ({
    id: socketId,
    username: username?.trim() || `Player_${socketId.substring(0, 4)}`, // Default username generation
});

// --- Room Access Functions ---

/**
 * Retrieves a room by its ID.
 * @param roomId - The ID of the room to retrieve.
 * @returns The Room object if found, otherwise undefined.
 */
export const getRoom = (roomId: string): Room | undefined => {
    return activeRooms.get(roomId);
};

/**
 * Gets an array of all currently active rooms.
 * @returns An array containing all Room objects.
 */
export const getAllRooms = (): Room[] => {
    return Array.from(activeRooms.values());
};

/**
 * Adds a new room to the store.
 * Logs a warning if the room already exists.
 * @param room - The Room object to add.
 */
export const addRoom = (room: Room): void => {
    if (activeRooms.has(room.roomId)) {
        console.warn(`[Store] Attempted to add existing room: ${room.roomId}`);
        return; // Or throw an error if this case should be impossible
    }
    activeRooms.set(room.roomId, room);
    console.log(`[Store] Room added: ${room.roomId}. Total rooms: ${activeRooms.size}`);
    // console.log("[Store] Active Rooms:", Array.from(activeRooms.keys())); // Optional detailed logging
};

/**
 * Deletes a room from the store by its ID.
 * @param roomId - The ID of the room to delete.
 * @returns True if the room was found and deleted, false otherwise.
 */
export const deleteRoom = (roomId: string): boolean => {
    const deleted = activeRooms.delete(roomId);
    if (deleted) {
        console.log(`[Store] Room deleted: ${roomId}. Total rooms: ${activeRooms.size}`);
        // console.log("[Store] Active Rooms:", Array.from(activeRooms.keys())); // Optional detailed logging
    }
    return deleted;
};

// --- Player Management Functions (within rooms) ---

/**
 * Adds a player object to a specific room's player list.
 * Checks if the player is already present.
 * @param roomId - The ID of the room to add the player to.
 * @param player - The Player object to add.
 * @returns The updated Room object if the player was added, otherwise undefined.
 */
export const addPlayerToRoom = (roomId: string, player: Player): Room | undefined => {
    const room = getRoom(roomId);
    // Check if room exists and player isn't already in it
    if (room && !room.players.some(p => p.id === player.id)) {
        room.players.push(player);
        console.log(`[Store] Player ${player.username}(${player.id}) added to room ${roomId}. Players: ${room.players.length}`);
        return room;
    }
    if (room) {
        console.warn(`[Store] Player ${player.id} already exists in room ${roomId}.`);
    }
    return undefined; // Indicate failure or player already exists
};

/**
 * Removes a player from a specific room by their ID.
 * @param roomId - The ID of the room to remove the player from.
 * @param playerId - The ID (socket.id) of the player to remove.
 * @returns An object containing the potentially updated Room and the Player object that was removed (if found).
 */
export const removePlayerFromRoom = (roomId: string, playerId: string): { room: Room | undefined, playerLeft: Player | undefined } => {
    const room = getRoom(roomId);
    let playerLeft: Player | undefined;
    if (room) {
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            playerLeft = room.players.splice(playerIndex, 1)[0]; // Remove player from array and get the removed element
            console.log(`[Store] Player ${playerLeft.username}(${playerId}) removed from room ${roomId}. Remaining: ${room.players.length}`);
            return { room, playerLeft };
        } else {
            console.warn(`[Store] Player ${playerId} not found in room ${roomId} for removal.`);
        }
    }
    return { room, playerLeft: undefined };
};

/**
 * Finds all rooms that a specific player (by socket ID) is currently in.
 * @param socketId - The socket ID of the player.
 * @returns An array of Room objects the player is found in.
 */
export const findRoomsBySocketId = (socketId: string): Room[] => {
    const roomsFound: Room[] = [];
    activeRooms.forEach((room) => {
        if (room.players.some(p => p.id === socketId)) {
            roomsFound.push(room);
        }
    });
    return roomsFound;
};

/**
 * Retrieves a specific player object from within a specific room.
 * @param roomId - The ID of the room.
 * @param playerId - The ID of the player to find.
 * @returns The Player object if found, otherwise undefined.
 */
export const getPlayerInRoom = (roomId: string, playerId: string): Player | undefined => {
    const room = getRoom(roomId);
    return room?.players.find(p => p.id === playerId);
};

// --- Game State Functions (within rooms) ---

/**
 * Updates properties of the Game object within a specific room.
 * Merges the provided partial state with the existing game state.
 * @param roomId - The ID of the room whose game state to update.
 * @param newState - An object containing the Game properties to update.
 * @returns The updated Room object if the room was found, otherwise undefined.
 */
export const updateGameState = (roomId: string, newState: Partial<Game>): Room | undefined => {
    const room = getRoom(roomId);
    if (room) {
        const previousState = room.game.state; // For logging comparison
        // Merge new state properties into the existing game state
        room.game = { ...room.game, ...newState };
        if (newState.state && previousState !== newState.state) {
             console.log(`[Store] Room ${roomId} game state changed from '${previousState}' to '${room.game.state}'`);
        } else if (Object.keys(newState).length > 0 && !newState.state) {
             console.log(`[Store] Room ${roomId} game properties updated.`);
        }
        return room;
    }
    console.warn(`[Store] Room ${roomId} not found for game state update.`);
    return undefined;
};

/**
 * Checks if a room's state should transition between 'waiting to start' and 'ready'
 * based on the current player count vs the minimum required players.
 * Updates the room's game state directly if a transition is needed.
 * @param room - The Room object to check and potentially update.
 * @returns The *new* GameState if a change occurred, otherwise null.
 */
export const checkAndSetReadyState = (room: Room): GameState | null => {
    const currentState = room.game.state;
    let newCalculatedState: GameState | null = null;

    // Determine what the state *should* be based on player count,
    // but only if the game isn't already started or finished.
    if (currentState === "waiting to start" || currentState === "ready") {
        if (room.players.length >= room.game.minPlayers) {
            newCalculatedState = "ready";
        } else {
            newCalculatedState = "waiting to start";
        }
    }

    // Only update and return the state if it's different from the current state
    if (newCalculatedState && newCalculatedState !== currentState) {
        updateGameState(room.roomId, { state: newCalculatedState });
        return newCalculatedState; // Return the new state
    }

    return null; // Return null if state didn't change or wasn't checked
};

// Add more specific data manipulation functions as needed for your game logic, e.g.:
// export const incrementPlayerScore = (roomId, playerId, points) => { ... }
// export const setNextTurn = (roomId) => { ... }

/**
 * Creates a new game instance based on gameType, initializes it, and assigns it to the room.
 * Updates the generic game state in the room.
 * @param roomId The ID of the room.
 * @param gameType The type of game to create.
 * @param players Array of Player objects in the room.
 * @param adminId The ID of the admin player.
 * @param io The Socket.IO server instance.
 * @param gameOptions Game-specific initialization options.
 * @returns The updated Room object with the game instance, or undefined if the room or game type is invalid.
 */
export const createAndAssignGameInstance = (
    roomId: string,
    gameType: GameType,
    players: Player[],
    adminId: string, // adminId is sufficient, ToohakGame constructor was expecting string[] for admins
    io: SocketIOServer,
    gameOptions: GameInitializationOptions = {} // Default to empty object
): Room | undefined => {
    const room = getRoom(roomId);
    if (!room) {
        console.warn(`[Store] Room ${roomId} not found for assigning game instance.`);
        return undefined;
    }

    let gameInstance: IGame | undefined;
    const playerIds = players.map(p => p.id); // ToohakGame constructor uses player IDs

    // Game Factory Logic
    switch (gameType) {
        case GameType.Toohak:
            // The ToohakGame constructor expects (roomId, playerIds, adminIds, io)
            // The IGame.initialize expects (players, options, io)
            // We need to align this. For now, let's assume ToohakGame will be refactored
            // to primarily use an `initialize` method as per IGame.
            // So, we first instantiate, then initialize.
            const toohak = new ToohakGame(roomId, playerIds, [adminId], io); // This matches current Toohak constructor
            // gameOptions for Toohak might include things like numberOfQuestions if we make it dynamic.
            // For now, ToohakGame's constructor and resetGameState handle its specific init.
            // We'll call a conceptual 'initialize' which might just be its constructor effects for now.
            // This part will need further alignment when ToohakGame implements IGame.
            // For now, we assume its constructor has set it up.
            gameInstance = toohak as IGame; // Cast to IGame
            // Conceptual: gameInstance.initialize(players, gameOptions, io); // This would be ideal
            break;
        // case GameType.AnotherGame:
        //     gameInstance = new AnotherGame(roomId, io);
        //     gameInstance.initialize(players, gameOptions, io);
        //     break;
        default:
            console.warn(`[Store] Unknown game type: ${gameType} for room ${roomId}`);
            return undefined;
    }

    if (gameInstance) {
        room.gameInstance = gameInstance;
        room.game.gameType = gameInstance.gameType; // Game instance should expose its type
        room.game.state = gameInstance.getCurrentState() as GameState; // Game instance should expose its state

        // Populate generic game fields from the specific instance if applicable
        // This depends on what getInternalGameData() and getGameStateForClient() will provide
        // and what ToohakGame.getCurrentState() returns.
        // For now, assume ToohakGame's constructor/resetGameState sets its state to "in game".
        // And createAndAssignGameInstance will set the generic room.game.state to "in game".
        // The ToohakGame.getCurrentState() should return a GameState compatible string.
        if (gameInstance.gameType === GameType.Toohak) {
             const toohakInternalData = gameInstance.getInternalGameData(); // if available and needed
             room.game.state = "in game"; // Explicitly set for Toohak start
             // room.game.currentQuestionIndex = toohakInternalData.generalData.questionIndex; (Example)
        }

        console.log(`[Store] ${gameType} instance created and assigned to room ${roomId}. Generic state: ${room.game.state}`);
        return room;
    }
    return undefined;
};