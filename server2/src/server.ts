// src/server.ts
import express, { Express, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

// Import configuration constants
import { PORT, HOST, CORS_OPTIONS } from './config';
// Import the function that sets up all Socket.IO event handlers
import { registerSocketHandlers } from './socket/index';

// -- Application Setup --
const app: Express = express();
const httpServer: http.Server = http.createServer(app);

// -- Socket.IO Server Setup --
// Initialize Socket.IO, attaching it to the HTTP server and applying CORS options
const io = new SocketIOServer(httpServer, {
    cors: CORS_OPTIONS, // Use CORS settings from config.ts
    // Optional: Add other Socket.IO server options here if needed
    // e.g., transports: ['websocket', 'polling'], // Explicitly define transports
});

// -- Register Socket.IO Event Handlers --
// This function (from src/socket/index.ts) contains the io.on('connection', ...) logic
// and sets up listeners for 'joinRoom', 'sendMessage', 'startGame', 'disconnect', etc.
registerSocketHandlers(io);

// -- Express Middleware & Routes --

// Serve static files (like index.html, css, client-side js) from the 'client-build' directory
// The path is resolved relative to the location of the compiled server.js file in 'dist'
app.use(express.static(path.join(__dirname, '..', 'client-build')));

// Removed the explicit static serving of socket.io-client


// -- Basic HTTP Routes --

// Route for the root path ('/') to serve the main HTML client file
app.get('/', (req: Request, res: Response) => {
    // Ensure the path resolves correctly relative to the 'dist' folder after build
    res.sendFile(path.join(__dirname, '..', 'client-build', 'index.html'));
});

// Optional: A simple health check endpoint for monitoring or load balancers
app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

// Optional: Catch-all for undefined routes (send a 404)
app.use((req: Request, res: Response) => {
    res.status(404).send("Sorry, can't find that!");
});


// -- Start Server --
httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
    console.log(`🕒 Current time: ${new Date().toLocaleString()}`); // Added current time log
});

// -- Graceful Shutdown Handling (Optional but Recommended) --
// Handles signals like SIGTERM (sent by process managers) or SIGINT (Ctrl+C)
const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} signal received: closing server gracefully.`);
    // 1. Stop accepting new connections
    httpServer.close(() => {
        console.log('✅ HTTP server closed.');
        // 2. Close Socket.IO connections (optional, httpServer.close often handles this)
        io.close(() => {
             console.log('✅ Socket.IO connections closed.');
             // 3. Close database connections, cleanup resources etc. here if needed
             // process.exit(0); // Exit process once cleanup is done
        });
        // Force exit after a timeout if cleanup hangs
        setTimeout(() => {
             console.error('Cleanup timed out, forcing exit.');
             process.exit(1);
        }, 5000); // 5 second timeout
    });
    // If httpServer.close fails or hangs initially
    setTimeout(() => {
        console.error('HTTP server close timed out, forcing exit.');
        process.exit(1);
   }, 10000); // 10 second timeout
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Handle Ctrl+C