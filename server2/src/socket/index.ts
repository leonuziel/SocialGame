// src/socket/index.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as roomHandlers from './roomHandlers'; // Import handlers for room management
import * as gameHandlers from './gameHandlers'; // Import handlers for game actions

// --- Define interfaces for expected data payloads for type safety ---
// Note: BasicCallback is implicitly defined by its usage in gameHandlers and roomHandlers,
// but could be explicitly defined here or in a shared types file if preferred.
// type BasicCallback = (response: { success: boolean; message: string }) => void;
// These should match the data structures expected by your handler functions.

interface JoinRoomData {
    roomId: string;
    username?: string;
    maxPlayers?: number; // Optional: Allow client to suggest max players when creating
}

interface MessageData {
    roomId: string;
    message: string;
}

// Added for Toohak game actions
interface SubmitAnswerData {
    roomId: string;
    questionId: number;
    answerId: number;
}

// Add interfaces for other game actions if needed, e.g.:
// interface PlayerActionData {
//     roomId: string;
//     actionType: string;
//     payload: any;
// }


/**
 * Registers all Socket.IO event handlers for incoming connections.
 * This function is called once when the server starts.
 * @param io - The main Socket.IO server instance.
 */
export const registerSocketHandlers = (io: SocketIOServer) => {

    // Listen for new connections from clients
    io.on('connection', (socket: Socket) => {
        // Log when a new user connects
        console.log(`[Socket] User connected: ${socket.id}`);

        // --- Register Room Handlers for this specific socket ---

        // Handles requests to join (or create if non-existent) a room
        socket.on('joinRoom', (data: JoinRoomData, callback) => {
            // Basic validation on incoming data
            if (!data || typeof data.roomId !== 'string' || data.roomId.trim() === '') {
                 if (callback) callback({ success: false, message: 'Invalid room ID provided.' });
                 return;
            }
             if (data.username && typeof data.username !== 'string') {
                 if (callback) callback({ success: false, message: 'Invalid username provided.' });
                 return;
             }
            // Delegate to the handler function
            roomHandlers.handleJoinRoom(io, socket, data, callback);
        });

        // Handles requests to leave the current room
        socket.on('leaveRoom', (roomId: string, callback) => {
             if (typeof roomId !== 'string') { // Basic type check
                 if (callback) callback({ success: false, message: 'Invalid room ID provided.' });
                 return;
             }
            // Delegate to the handler function
            roomHandlers.handleLeaveRoom(io, socket, roomId, callback);
        });


        // --- Register Game Handlers for this specific socket ---

        // Handles chat messages sent by a player
        socket.on('sendMessage', (data: MessageData) => { // Often no callback needed for broadcasts
            if (!data || typeof data.roomId !== 'string' || typeof data.message !== 'string') {
                console.warn(`[Socket] Invalid message data received from ${socket.id}`);
                return; // Don't process invalid data
            }
            // Delegate to the handler function
            gameHandlers.handleSendMessage(io, socket, data);
        });

        // Handles requests from the admin to start the game
        socket.on('startGame', (roomId: string, callback) => {
             if (typeof roomId !== 'string') { // Basic type check
                 if (callback) callback({ success: false, message: 'Invalid room ID provided.' });
                 return;
             }
            // Delegate to the handler function
            gameHandlers.handleStartGame(io, socket, roomId, callback);
        });

        // --- Register listeners for your specific game actions here ---
        socket.on('submitAnswer', (data: SubmitAnswerData, callback) => {
            // Add validation for data structure as needed
            if (!data || typeof data.roomId !== 'string' || typeof data.questionId !== 'number' || typeof data.answerId !== 'number') {
                if (callback) callback({ success: false, message: 'Invalid data for submitting answer.' });
                return;
            }
            gameHandlers.handleSubmitAnswer(io, socket, data, callback);
        });

        socket.on('startToohakQuestions', (roomId: string, callback) => { // Admin action
            if (typeof roomId !== 'string') {
                if (callback) callback({ success: false, message: 'Invalid room ID.' });
                return;
            }
            gameHandlers.handleStartToohakQuestionCycle(io, socket, roomId, callback);
        });
        /*
        socket.on('playerAction', (data: PlayerActionData, callback) => {
            // Add validation for 'data' structure as needed
            gameHandlers.handlePlayerAction(io, socket, data, callback);
        });
        */


        // --- Handle Socket Disconnection ---
        // This is a built-in Socket.IO event
        socket.on('disconnect', (reason: string) => {
            console.log(`[Socket] User disconnected: ${socket.id}. Reason: ${reason}`);
            // Delegate cleanup logic (like removing from rooms) to the room handler
            roomHandlers.handleDisconnect(io, socket);
        });


        // --- Basic Socket Error Handling ---
        // Listen for errors originating from this specific socket
        socket.on('error', (error) => {
            console.error(`[Socket] Error from socket ${socket.id}:`, error);
            // Depending on the error, you might want to:
            // - Log it (already done)
            // - Send a specific error message to the client: socket.emit('errorMessage', { message: 'An internal error occurred.' });
            // - Force disconnect the client: socket.disconnect(true);
        });

    }); // End of io.on('connection')

    console.log('[Socket] Main connection handler registered.');
}; // End of registerSocketHandlers