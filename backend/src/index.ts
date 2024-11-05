import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes';
import RoomManager from './RoomManager';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

const htmlServer = http.createServer(app);
const socketsServer = new Server(htmlServer, {
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
