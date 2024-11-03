import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

const playerList: Map<string, string[]> = new Map<string, string[]>();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a room
    socket.on('joinRoom', (room) => {
        // Mock check: Assume rooms with names longer than 3 characters "exist"
        const canJoinRoom = room.length > 3
        if (canJoinRoom) {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            socket.emit('joinedRoom', { success: true, room, role: 'Admin', message: `Joined room: ${room}` });
            addPlayerToRoom(room, socket.id)
            updateRoomPlayersList(room);
        }
    });

    socket.on('leaveRoom', (room) => {
        removePlayer(room, socket.id)
        updateRoomPlayersList(room);
    })

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

function addPlayerToRoom(room: string, playerId: string) {
    if (!(playerList.has(room))) {
        playerList.set(room, []);
    }
    playerList.get(room)!.push(playerId);
}

function getPlayersInRoom(room: string): string[] | undefined {
    return playerList.get(room);
}

function updateRoomPlayersList(room: string) {
    io.to(room).emit('playerListUpdated', getPlayersInRoom(room));
}

function removePlayer(room: any, playerId: string) {
    if (!(playerList.has(room))) {
        return
    }
    const filteredList = playerList.get(room)!.filter((currentPlayer => currentPlayer != playerId))
    playerList.set(room, filteredList);
}
