import { Server, Socket } from 'socket.io';

class RoomManager {
    private static instance: RoomManager;
    private roomIdToPlayerList: Map<string, string[]> = new Map<string, string[]>();

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

            socket.on('joinRoom', (room: string) => this.handleJoinRoom(socket, room));
            socket.on('leaveRoom', (room: string) => this.handleLeaveRoom(socket, room));
            socket.on('kickPlayer', ({ roomId, player }: { roomId: string; player: string }) =>
                this.handleKickPlayer(socket, roomId, player)
            );
            socket.on('startGame', (roomId: string) => this.handleStartGame(socket, roomId));

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }

    private handleJoinRoom(socket: Socket, room: string) {
        const canJoinRoom = room.length > 3;
        if (canJoinRoom) {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            socket.emit('joinedRoom', { success: true, room, role: 'Admin', message: `Joined room: ${room}` });
            this.addPlayerToRoom(room, socket.id);
            this.updateRoomPlayersList(socket, room);
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

    private handleStartGame(socket: Socket, roomId: string) {
        if (this.isAdmin(socket, roomId)) {
            socket.to(roomId).emit('gameStarted', { type: 'test', players: this.getPlayersInRoom(roomId), extraInfo: {} });
        }
    }

    private addPlayerToRoom(room: string, playerId: string) {
        if (!this.roomIdToPlayerList.has(room)) {
            this.roomIdToPlayerList.set(room, []);
        }
        this.roomIdToPlayerList.get(room)!.push(playerId);
    }

    private getPlayersInRoom(room: string): string[] | undefined {
        return this.roomIdToPlayerList.get(room);
    }

    private updateRoomPlayersList(socket: Socket, room: string) {
        socket.to(room).emit('playerListUpdated', this.getPlayersInRoom(room));
    }

    private removePlayer(socket: Socket, room: string) {
        socket.leave(room);
        const filteredList = this.roomIdToPlayerList.get(room)?.filter((id) => id !== socket.id) || [];
        this.roomIdToPlayerList.set(room, filteredList);
    }

    private removePlayerById(room: string, playerId: string, socket: Socket) {
        socket.leave(room);
        const filteredList = this.roomIdToPlayerList.get(room)?.filter((id) => id !== playerId) || [];
        this.roomIdToPlayerList.set(room, filteredList);
    }

    private isAdmin(_socket: Socket, _roomId: string): boolean {
        // Placeholder admin check
        return true;
    }
}

export default RoomManager.getInstance();
