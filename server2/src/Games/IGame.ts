// server2/src/Games/IGame.ts
import { Server as SocketIOServer } from 'socket.io';
import { Player } from '../data/models'; // Generic Player from main models
import { GameType } from './GameUtils'; // GameType enum

// Represents generic data passed for a player action
export interface PlayerActionPayload {
    actionType: string; // e.g., "submitAnswer", "playCard", "placeBet"
    [key: string]: any; // Action-specific data
}

// Represents initialization options for a game
export interface GameInitializationOptions {
    maxPlayers?: number;
    // Any other options passed from client or server when creating the game
    [key: string]: any; 
}

export interface IGame {
    readonly roomId: string;
    readonly gameType: GameType; // Use the imported GameType enum
    
    // --- Lifecycle Methods ---
    /**
     * Initializes the game with a list of players and specific options.
     * This is called when the game is first created and associated with a room.
     * Should set up the initial game state, player data structures, etc.
     * @param players - Array of Player objects from data/models.
     * @param options - Game-specific initialization options.
     * @param io - Socket.IO server instance for emitting events.
     */
    initialize(players: Player[], options: GameInitializationOptions, io: SocketIOServer): void;

    /**
     * Starts the actual gameplay or the first cycle/round.
     * Called by an admin action or automatically when conditions are met.
     */
    startGameCycle(): void;

    /**
     * Concludes the game, calculates final scores, and sets the game state to 'concluded'.
     * May be called due to win conditions, player actions, or admin intervention.
     * @param conclusionReason - Optional string describing why the game ended.
     */
    concludeGame(conclusionReason?: string): void;

    // --- Player Interaction ---
    /**
     * Handles an action sent by a player.
     * @param playerId - The ID of the player performing the action.
     * @param action - The payload containing action type and data.
     * @returns A promise that might resolve with success/failure or specific feedback.
     */
    handlePlayerAction(playerId: string, action: PlayerActionPayload): Promise<{ success: boolean; message?: string; data?: any }>;
    
    // --- State & Data ---
    /**
     * Returns the current state of the game, suitable for sending to clients.
     * This should include all data clients need to render the game,
     * but might omit server-side sensitive data.
     */
    getGameStateForClient(): any;

    /**
     * (Optional) Method to handle player disconnection mid-game.
     * @param playerId - The ID of the disconnected player.
     */
    handlePlayerDisconnect?(playerId: string): void;

    /**
     * Gets the current detailed game data (internal state).
     * Useful for persistence or complex server-side logic.
     */
    getInternalGameData(): any; 

    /**
     * Gets the current game state (e.g., "in game", "concluded")
     */
    getCurrentState(): string; // Should match GameState type from models
}
