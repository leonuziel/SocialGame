import { io } from 'socket.io-client';


const ServerSocket = io(
    process.env.NODE_ENV === 'production'
        ? 'https://socialgame-441209.lm.r.appspot.com' // Production URL
        : 'http://localhost:5000' // Use the current hostname (e.g., localhost for dev)
);
type Args = {};

ServerSocket.on<any>('connect', (args: Args) => {
    console.log('Connected to server:', ServerSocket.id);
});

ServerSocket.on('disconnect', () => {
    console.log('Disconnected from server');
});

ServerSocket.on('connect_error', (err: any) => {
    console.log('Connection error:', err);
});

export default ServerSocket;
