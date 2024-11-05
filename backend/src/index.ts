import express from 'express';
import http from 'http';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
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

const roomIdToPlayerList: Map<string, string[]> = new Map<string, string[]>();

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
        removePlayer(room, socket.id, socket);
        updateRoomPlayersList(room);
    })

    // Example of handling player kick
    socket.on('kickPlayer', ({ roomId, player }) => {
        if (isAdmin(socket, roomId)) {  // Check if the requester is an admin
            removePlayer(roomId, player, socket);
            io.to(roomId).emit('playerListUpdated', getPlayersInRoom(roomId));
            io.to(player).emit('kicked', roomId);
        }
    });

    // Example of handling game start
    socket.on('startGame', (roomId) => {
        if (isAdmin(socket, roomId)) {
            io.to(roomId).emit('gameStarted', { type: 'test', players: getPlayersInRoom(roomId), extraInfo: {} });
            console.log('User disconnected:', socket.id);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

function addPlayerToRoom(room: string, playerId: string) {
    if (!(roomIdToPlayerList.has(room))) {
        roomIdToPlayerList.set(room, []);
    }
    roomIdToPlayerList.get(room)!.push(playerId);
}

function getPlayersInRoom(room: string): string[] | undefined {
    return roomIdToPlayerList.get(room);
}

function updateRoomPlayersList(room: string) {
    io.to(room).emit('playerListUpdated', getPlayersInRoom(room));
}

function removePlayer(room: string, playerId: string, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
    if (!(roomIdToPlayerList.has(room))) {
        return
    }
    socket.leave(room);
    const filteredList = roomIdToPlayerList.get(room)!.filter((currentPlayer => currentPlayer != playerId))
    roomIdToPlayerList.set(room, filteredList);
    console.log(`User ${playerId} was removed from room ${room}`);

}
function isAdmin(_socket: any, roomId: string) {
    return true;
}

