import { Server, Socket } from 'socket.io';
import { Game, GameType, TriviaGame } from './Games/GameUtils';
import { ToohakGame } from './Games/Toohak';
import { error } from 'console';


class RoomManager {
    private static instance: RoomManager;
    private roomIdToGame: Map<string, Game<unknown, unknown>> = new Map<string, Game<unknown, unknown>>();
    private roomIdToRoom: Map<string, { gameType: GameType, players: string[], admin?: string }> =
        new Map<string, { gameType: GameType, players: string[] }>()


    public serverSocket?: Server;
    private constructor() { }

    public static getInstance(): RoomManager {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    public setupRoomEvents(io: Server) {
        this.serverSocket = io;
        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('joinRoom', (room: string, onJoinCallback: (success: boolean, room: string, roomType: GameType, players: string[], role: 'Admin' | 'Member', message: string) => void) => {
                this.handleJoinRoom(socket, room, onJoinCallback);
            });
            socket.on('leaveRoom', (room: string) => this.handleLeaveRoom(socket, room));
            socket.on('kickPlayer', ({ roomId, player }: { roomId: string; player: string }) =>
                this.handleKickPlayer(socket, roomId, player)
            );
            socket.on('startGame', (roomId: string, onStartCallback: (success: boolean, gameType: string, players: string[], extraInfo: unknown) => void) => {
                this.handleStartGame(socket, roomId, onStartCallback);
            });
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }

    private handleJoinRoom(socket: Socket, room: string, onJoinCallback: (success: boolean, room: string, gameType: GameType, players: string[], role: 'Admin' | 'Member', message: string) => void) {
        const canJoinRoom = room.length > 3; // TODO fix this
        if (canJoinRoom) {
            this.createRoomIfNotExisting(room, socket.id, GameType.Toohak)
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            this.addPlayerToRoom(room, socket);
            this.updateRoomPlayersList(socket, room);
            const players = this.getPlayersInRoom(room);
            onJoinCallback(true, room, GameType.Toohak, players, 'Admin', `Joined room: ${room}`);
        } else {
            onJoinCallback(false, room, GameType.None, [], "Member", `Failed To Join`);
        }
    }
    createRoomIfNotExisting(roomId: string, initiator: string, gameType: GameType) {
        const roomData = this.roomIdToRoom.get(roomId)
        if (!roomData) {
            this.roomIdToRoom.set(roomId, { gameType, players: [], admin: initiator })
        }
    }

    private handleLeaveRoom(socket: Socket, room: string) {
        this.removePlayer(socket, room);
        this.updateRoomPlayersList(socket, room);
    }

    private handleKickPlayer(socket: Socket, roomId: string, player: string) {
        if (this.isAdmin(socket, roomId)) {
            this.removePlayerById(roomId, player, socket);
            socket.to(roomId).emit('playerListUpdated', this.getPlayersInRoom(roomId));
            socket.to(player).emit('kicked', roomId);
        }
    }

    private handleStartGame(socket: Socket, roomId: string, onStartCallback: (success: boolean, gameType: string, players: string[], extraInfo: unknown) => void) {
        if (this.isAdmin(socket, roomId)) {
            const players = this.getPlayersInRoom(roomId);
            const game: Game<{}, {}> = new ToohakGame(roomId, players, players, socket);
            this.roomIdToGame.set(roomId, game);

            onStartCallback(true, game.getGameType(), players, {});
            socket.to(roomId).emit('gameStarted', { type: game.getGameType(), players, extraInfo: {} });
        } else {
            onStartCallback(false, '', [], {});
        }
    }

    private addPlayerToRoom(room: string, playerSocket: Socket) {
        if (!this.roomIdToRoom.has(room)) {
            this.roomIdToRoom.set(room, { gameType: GameType.None, players: [] });
        }
        this.roomIdToRoom.get(room)!.players.push(playerSocket.id);
    }

    private getPlayersInRoom(room: string): string[] {
        const roomData = this.roomIdToRoom.get(room)
        if (!roomData)
            throw Error()
        return roomData.players || [];
    }
    private updateRoomPlayersList(socket: Socket, room: string) {
        socket.to(room).emit('playerListUpdated', this.getPlayersInRoom(room));
    }

    private removePlayer(socket: Socket, room: string) {
        this.removePlayerById(room, socket.id, socket);
    }

    private removePlayerById(room: string, playerId: string, socket: Socket) {
        const roomData = this.roomIdToRoom.get(room)
        if (!roomData)
            throw Error()
        socket.leave(room);
        const filteredList = this.roomIdToRoom.get(room)?.players?.filter((socketId) => socketId !== playerId) || [];
        roomData.players = filteredList;
    }

    private isAdmin(_socket: Socket, _roomId: string): boolean {
        // Placeholder admin check
        return true;
    }
}

export default RoomManager.getInstance();


