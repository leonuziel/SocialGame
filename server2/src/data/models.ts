// src/data/models.ts
import { GameType, Question } from '../Games/GameUtils';
// import { ToohakGame } from '../Games/Toohak'; // Removed
import { IGame } from '../Games/IGame'; // Added

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
    gameType?: GameType; // Added
    state: GameState;       // Current phase of the game
    maxPlayers: number;     // Maximum number of players allowed in the room
    minPlayers: number;     // Minimum number of players required to reach the "ready" state
    currentRound: number;   // Example game state property
    currentQuestionIndex?: number; // From ToohakGeneralData.questionIndex
    currentQuestionData?: Question; // From ToohakGeneralData.questionData (Question type from GameUtils)
    playerScores?: Record<string, number>; // To store scores, maps playerId to score
    playerAnswerStatuses?: Record<string, { answered: boolean; answerTime: number }>; // Example
    // OR a more generic approach:
    // gameSpecificDetails?: any;
}

/**
 * Represents a game room, containing players and the game instance.
 */
export interface Room {
    roomId: string;         // Unique identifier for the room
    players: Player[];      // Array of Player objects currently in the room
    game: Game;             // The Game object holding the state for this room's game
    adminId?: string;       // The socket.id of the player who created the room and has admin privileges (like starting the game)
    gameInstance?: IGame; // Changed to IGame
    // You could add other room metadata here, e.g.:
    // createdAt?: Date;
    // isPrivate?: boolean;
}