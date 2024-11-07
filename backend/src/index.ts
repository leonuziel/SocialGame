import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes';
import RoomManager from './RoomManager';
import { RoomManagementClientToServerEvents, RoomManagementServerToClientEvents } from './serverInterfaces';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);


type clientToServerEvents = RoomManagementClientToServerEvents;
type serverToClientEvents = RoomManagementServerToClientEvents;
type interServerEvents = {};
interface SocketData {
    name: string;
    age: number;
}

const htmlServer = http.createServer(app);
const socketsServer = new Server<clientToServerEvents, serverToClientEvents, interServerEvents, SocketData>(htmlServer, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Set up room events using RoomManager
RoomManager.setupRoomEvents(socketsServer);

htmlServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
