import express, { Express, Request, Response} from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import routes from './routes';
import RoomManager from './RoomManager';
import { SocketData, clientToServerEvents, interServerEvents, serverToClientEvents } from './utils';

const app: Express = express();
const port :number = parseInt(process.env.PORT || '5000');

app.use(cors());
app.use(express.json());
app.use('/api', routes);


const htmlServer:http.Server = http.createServer(app);

export const socketsServer = new SocketIOServer<clientToServerEvents, serverToClientEvents, interServerEvents, SocketData>(htmlServer, {
    cors: {
        origin: ['http://localhost:3000', 'https://socialgame-441209.lm.r.appspot.com'], // Add both local and production URLs here
        methods: ['GET', 'POST'],
        allowedHeaders: ['content-type'],
        credentials: true,
    }, transports: ['polling']
});

// Set up room events using RoomManager
RoomManager.setupRoomEvents(socketsServer);

htmlServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
