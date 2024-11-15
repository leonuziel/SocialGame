"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketsServer = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const RoomManager_1 = __importDefault(require("./RoomManager"));
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api', routes_1.default);
const htmlServer = http_1.default.createServer(app);
exports.socketsServer = new socket_io_1.Server(htmlServer, {
    cors: {
        origin: ['http://localhost:3000', 'https://socialgame-441209.lm.r.appspot.com'], // Add both local and production URLs here
        methods: ['GET', 'POST'],
        allowedHeaders: ['content-type'],
        credentials: true,
    }, transports: ['polling']
});
// Set up room events using RoomManager
RoomManager_1.default.setupRoomEvents(exports.socketsServer);
htmlServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
