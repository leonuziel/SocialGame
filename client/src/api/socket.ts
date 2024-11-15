import { io } from 'socket.io-client';

const socket = io(
    process.env.NODE_ENV === 'production'
        ? 'https://socialgame-441209.lm.r.appspot.com' // Production URL
        : 'http://localhost:5000' // Use the current hostname (e.g., localhost for dev)
);
type Args = {};

socket.on<any>('connect', (args: Args) => {
    console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.log('Connection error:', err);
});

export default socket;
