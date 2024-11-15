"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameUtils_1 = require("./Games/GameUtils");
class RoomManager {
    constructor() {
        this.roomIdToPlayerList = new Map();
        this.roomIdToGame = new Map();
    }
    static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }
    setupRoomEvents(io) {
        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);
            socket.on('joinRoom', (room, onJoinCallback) => {
                this.handleJoinRoom(socket, room, onJoinCallback);
            });
            socket.on('leaveRoom', (room) => this.handleLeaveRoom(socket, room));
            socket.on('kickPlayer', ({ roomId, player }) => this.handleKickPlayer(socket, roomId, player));
            socket.on('startGame', (roomId, onStartCallback) => {
                this.handleStartGame(socket, roomId, onStartCallback);
            });
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }
    handleJoinRoom(socket, room, onJoinCallback) {
        const canJoinRoom = room.length > 3; // TODO fix this
        if (canJoinRoom) {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            this.addPlayerToRoom(room, socket);
            this.updateRoomPlayersList(socket, room);
            const players = this.getPlayersInRoom(room);
            onJoinCallback(true, room, players, 'Admin', `Joined room: ${room}`);
        }
        else {
            onJoinCallback(false, room, [], "Member", `Failed To Join`);
        }
    }
    handleLeaveRoom(socket, room) {
        this.removePlayer(socket, room);
        this.updateRoomPlayersList(socket, room);
    }
    handleKickPlayer(socket, roomId, player) {
        if (this.isAdmin(socket, roomId)) {
            this.removePlayerById(roomId, player, socket);
            socket.to(roomId).emit('playerListUpdated', this.getPlayersInRoom(roomId));
            socket.to(player).emit('kicked', roomId);
        }
    }
    handleStartGame(socket, roomId, onStartCallback) {
        if (this.isAdmin(socket, roomId)) {
            const players = this.getPlayersInRoom(roomId);
            const game = new GameUtils_1.TriviaGame(players);
            this.roomIdToGame.set(roomId, game);
            onStartCallback(true, game.getGameType(), players, {});
            socket.to(roomId).emit('gameStarted', { type: game.getGameType(), players, extraInfo: {} });
        }
        else {
            onStartCallback(false, '', [], {});
        }
    }
    addPlayerToRoom(room, playerSocket) {
        if (!this.roomIdToPlayerList.has(room)) {
            this.roomIdToPlayerList.set(room, []);
        }
        this.roomIdToPlayerList.get(room).push(playerSocket.id);
    }
    getPlayersInRoom(room) {
        return this.roomIdToPlayerList.get(room) || [];
    }
    updateRoomPlayersList(socket, room) {
        socket.to(room).emit('playerListUpdated', this.getPlayersInRoom(room));
    }
    removePlayer(socket, room) {
        this.removePlayerById(room, socket.id, socket);
    }
    removePlayerById(room, playerId, socket) {
        var _a;
        socket.leave(room);
        const filteredList = ((_a = this.roomIdToPlayerList.get(room)) === null || _a === void 0 ? void 0 : _a.filter((socketId) => socketId !== playerId)) || [];
        this.roomIdToPlayerList.set(room, filteredList);
    }
    isAdmin(_socket, _roomId) {
        // Placeholder admin check
        return true;
    }
}
exports.default = RoomManager.getInstance();
