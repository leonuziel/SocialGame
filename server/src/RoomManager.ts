import { Server, Socket } from 'socket.io';
import { Game, TriviaGame } from './Games/GameUtils';


class RoomManager {
    private static instance: RoomManager;
    private roomIdToPlayerList: Map<string, string[]> = new Map<string, string[]>();
    private roomIdToGame: Map<string, Game> = new Map<string, Game>();

    private constructor() { }

    public static getInstance(): RoomManager {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    public setupRoomEvents(io: Server) {
        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('joinRoom', (room: string, onJoinCallback: (success: boolean, room: string, players: string[], role: 'Admin' | 'Member', message: string) => void) => {
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

    private handleJoinRoom(socket: Socket, room: string, onJoinCallback: (success: boolean, room: string, players: string[], role: 'Admin' | 'Member', message: string) => void) {
        const canJoinRoom = room.length > 3; // TODO fix this
        if (canJoinRoom) {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            this.addPlayerToRoom(room, socket);
            this.updateRoomPlayersList(socket, room);
            const players = this.getPlayersInRoom(room);
            onJoinCallback(true, room, players, 'Admin', `Joined room: ${room}`);
        } else {
            onJoinCallback(false, room, [], "Member", `Failed To Join`);
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
            const game: Game = new TriviaGame(players);
            this.roomIdToGame.set(roomId, game);


            onStartCallback(true, game.getGameType(), players, {});
            socket.to(roomId).emit('gameStarted', { type: game.getGameType(), players, extraInfo: {} });
        } else {
            onStartCallback(false, '', [], {});
        }
    }

    private addPlayerToRoom(room: string, playerSocket: Socket) {
        if (!this.roomIdToPlayerList.has(room)) {
            this.roomIdToPlayerList.set(room, []);
        }
        this.roomIdToPlayerList.get(room)!.push(playerSocket.id);
    }

    private getPlayersInRoom(room: string): string[] {
        return this.roomIdToPlayerList.get(room) || [];
    }

    private updateRoomPlayersList(socket: Socket, room: string) {
        socket.to(room).emit('playerListUpdated', this.getPlayersInRoom(room));
    }

    private removePlayer(socket: Socket, room: string) {
        this.removePlayerById(room, socket.id, socket);
    }

    private removePlayerById(room: string, playerId: string, socket: Socket) {
        socket.leave(room);
        const filteredList = this.roomIdToPlayerList.get(room)?.filter((socketId) => socketId !== playerId) || [];
        this.roomIdToPlayerList.set(room, filteredList);
    }

    private isAdmin(_socket: Socket, _roomId: string): boolean {
        // Placeholder admin check
        return true;
    }
}

export default RoomManager.getInstance();
