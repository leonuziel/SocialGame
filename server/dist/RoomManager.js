"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameUtils_1 = require("./Games/GameUtils");
const Toohak_1 = require("./Games/Toohak");
class RoomManager {
    constructor() {
        this.roomIdToGame = new Map();
        this.roomIdToRoom = new Map();
    }
    static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }
    setupRoomEvents(io) {
        this.serverSocket = io;
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
            this.createRoomIfNotExisting(room, socket.id, GameUtils_1.GameType.Toohak);
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            this.addPlayerToRoom(room, socket);
            this.updateRoomPlayersList(socket, room);
            const players = this.getPlayersInRoom(room);
            onJoinCallback(true, room, GameUtils_1.GameType.Toohak, players, 'Admin', `Joined room: ${room}`);
        }
        else {
            onJoinCallback(false, room, GameUtils_1.GameType.None, [], "Member", `Failed To Join`);
        }
    }
    createRoomIfNotExisting(roomId, initiator, gameType) {
        const roomData = this.roomIdToRoom.get(roomId);
        if (!roomData) {
            this.roomIdToRoom.set(roomId, { gameType, players: [], admin: initiator });
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
            const game = new Toohak_1.ToohakGame(roomId, players, players, socket);
            this.roomIdToGame.set(roomId, game);
            onStartCallback(true, game.getGameType(), players, {});
            socket.to(roomId).emit('gameStarted', { type: game.getGameType(), players, extraInfo: {} });
        }
        else {
            onStartCallback(false, '', [], {});
        }
    }
    addPlayerToRoom(room, playerSocket) {
        if (!this.roomIdToRoom.has(room)) {
            this.roomIdToRoom.set(room, { gameType: GameUtils_1.GameType.None, players: [] });
        }
        this.roomIdToRoom.get(room).players.push(playerSocket.id);
    }
    getPlayersInRoom(room) {
        const roomData = this.roomIdToRoom.get(room);
        if (!roomData)
            throw Error();
        return roomData.players || [];
    }
    updateRoomPlayersList(socket, room) {
        socket.to(room).emit('playerListUpdated', this.getPlayersInRoom(room));
    }
    removePlayer(socket, room) {
        this.removePlayerById(room, socket.id, socket);
    }
    removePlayerById(room, playerId, socket) {
        var _a, _b;
        const roomData = this.roomIdToRoom.get(room);
        if (!roomData)
            throw Error();
        socket.leave(room);
        const filteredList = ((_b = (_a = this.roomIdToRoom.get(room)) === null || _a === void 0 ? void 0 : _a.players) === null || _b === void 0 ? void 0 : _b.filter((socketId) => socketId !== playerId)) || [];
        roomData.players = filteredList;
    }
    isAdmin(_socket, _roomId) {
        // Placeholder admin check
        return true;
    }
}
exports.default = RoomManager.getInstance();
