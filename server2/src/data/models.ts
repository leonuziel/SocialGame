// src/data/models.ts

/**
 * Represents a player connected via a socket.
 */
export interface Player {
    id: string; // Corresponds to the unique socket.id
    username: string; // Player's chosen display name
    // Add other player-specific data as needed, e.g.:
    // score?: number;
    // isReady?: boolean; // If implementing manual ready-up
    // character?: string;
}

/**
 * Defines the possible states of a game within a room.
 */
export type GameState =
    | "waiting to start" // Initial state, players joining
    | "ready"            // Minimum players reached, waiting for admin to start
    | "in game"          // Game has been started and is actively being played
    | "concluded"        // Game has finished (e.g., winner decided, time up)
    | "paused";          // Optional: Game temporarily paused (e.g., player disconnected)

/**
 * Represents the state of a specific game instance within a room.
 * Customize this heavily based on your actual game's rules and data.
 */
export interface Game {
    state: GameState;       // Current phase of the game
    maxPlayers: number;     // Maximum number of players allowed in the room
    minPlayers: number;     // Minimum number of players required to reach the "ready" state
    currentRound: number;   // Example game state property
    // Add more game-specific state properties here, e.g.:
    // currentTurnPlayerId?: string;
    // gameBoard?: any[][]; // Replace 'any' with your board structure type
    // scores?: Record<string, number>; // Map player IDs to scores
    // gameSettings?: object; // Room-specific settings
}

/**
 * Represents a game room, containing players and the game instance.
 */
export interface Room {
    roomId: string;         // Unique identifier for the room
    players: Player[];      // Array of Player objects currently in the room
    game: Game;             // The Game object holding the state for this room's game
    adminId?: string;       // The socket.id of the player who created the room and has admin privileges (like starting the game)
    // You could add other room metadata here, e.g.:
    // createdAt?: Date;
    // isPrivate?: boolean;
}