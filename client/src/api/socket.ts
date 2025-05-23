import { io } from 'socket.io-client';


const ServerSocket = io(
    process.env.NODE_ENV === 'production'
        ? 'https://socialgame-441209.lm.r.appspot.com' // Production URL - Will be updated later
        : 'http://localhost:3000' // Connect to server2's default port for dev
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
