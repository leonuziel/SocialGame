// src/config.ts
import { CorsOptions } from 'socket.io/dist/namespace';

// -- Network Configuration --
// Port the server will listen on. Uses environment variable if set, otherwise defaults to 3000.
export const PORT: number = parseInt(process.env.PORT || '3000', 10);
// Host the server will bind to. '0.0.0.0' allows connections from any network interface.
// Use '127.0.0.1' (or 'localhost') to only allow connections from the same machine.
export const HOST: string = process.env.HOST || '0.0.0.0';

// -- CORS Configuration for Socket.IO --
// Controls which origins (websites) are allowed to connect to your Socket.IO server.
export const CORS_OPTIONS: Partial<CorsOptions> = {
    // IMPORTANT: For production, replace "*" with the specific URL(s) of your frontend application
    // e.g., origin: "https://my-awesome-game.com" or ["https://my-game.com", "https://admin.my-game.com"]
    origin: "*",
    methods: ["GET", "POST"] // Allowed HTTP methods for CORS requests (usually relevant for polling fallbacks)
};

// -- Game Defaults --
// Default maximum number of players allowed in a room if not specified on creation.
export const MAX_PLAYERS_DEFAULT = 4;

// Default minimum number of players required for a game state to become "ready".
// (Note: This is also defined directly in store.ts currently, consider consolidating if needed)
export const MIN_PLAYERS_DEFAULT = 2;

// You could add other game-related defaults here, like:
// export const DEFAULT_STARTING_SCORE = 0;
// export const DEFAULT_ROUND_TIME_SECONDS = 60;