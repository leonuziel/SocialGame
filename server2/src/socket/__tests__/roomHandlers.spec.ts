// server2/src/socket/__tests__/roomHandlers.spec.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as roomHandlers from '../roomHandlers';
import * as store from '../../data/store';
import { GameType } from '../../Games/GameUtils';
import { Player, Room, GameState, Game } from '../../data/models'; // Added Game for typing

// Mock the entire store module
jest.mock('../../data/store', () => ({
    getRoom: jest.fn(),
    addRoom: jest.fn(),
    addPlayerToRoom: jest.fn(),
    removePlayerFromRoom: jest.fn(),
    deleteRoom: jest.fn(),
    checkAndSetReadyState: jest.fn(),
    createNewPlayer: jest.fn(),
    createNewGame: jest.fn(),
    findRoomsBySocketId: jest.fn(),
    getPlayerInRoom: jest.fn(), // Added as it's used in gameHandlers, though not directly by roomHandlers
    updateGameState: jest.fn(), // Added as it might be called by checkAndSetReadyState
}));

describe('Socket Room Handlers', () => {
    let mockIo: SocketIOServer;
    let mockSocket: Partial<Socket>; // Use Partial<Socket> for easier mocking
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock Socket.IO Server instance
        mockIo = {
            to: jest.fn().mockReturnThis(), // Allows chaining like io.to(roomId).emit()
            emit: jest.fn(),
        } as any; // Cast to any to avoid implementing all Server methods

        // Mock Socket instance
        mockSocket = {
            id: 'socket123',
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(), // For socket.to(roomId).emit()
        };
        mockCallback = jest.fn();
    });

    describe('handleJoinRoom', () => {
        const defaultPlayer = { id: 'socket123', username: 'Alice' } as Player;
        const defaultGame = { 
            state: 'waiting to start' as GameState, 
            gameType: GameType.None, 
            maxPlayers: 4, 
            minPlayers: 2, 
            currentRound: 0,
            playerScores: {},
            playerAnswerStatuses: {}
        } as Game;

        beforeEach(() => {
            // Setup default mocks for createNewPlayer and createNewGame for join room tests
            (store.createNewPlayer as jest.Mock).mockReturnValue(defaultPlayer);
            (store.createNewGame as jest.Mock).mockReturnValue(defaultGame);
        });

        it('should allow a player to create and join a new room', () => {
            const joinData = { roomId: 'newRoom', username: 'Alice', maxPlayers: 4 };
            const expectedRoom = { 
                roomId: 'newRoom', 
                players: [defaultPlayer], 
                adminId: defaultPlayer.id, 
                game: defaultGame 
            } as Room;

            (store.getRoom as jest.Mock).mockReturnValue(undefined); // Room does not exist
            (store.addRoom as jest.Mock).mockImplementation((room: Room) => {
                // Simulate addRoom by making the room available via getRoom for subsequent checks if any
                (store.getRoom as jest.Mock).mockReturnValue(room);
            });
            (store.checkAndSetReadyState as jest.Mock).mockReturnValue(null); 

            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);

            expect(store.getRoom).toHaveBeenCalledWith('newRoom');
            expect(store.createNewPlayer).toHaveBeenCalledWith(mockSocket.id, 'Alice');
            expect(store.createNewGame).toHaveBeenCalledWith(GameType.None, 4);
            expect(store.addRoom).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'newRoom', adminId: mockSocket.id }));
            expect(mockSocket.join).toHaveBeenCalledWith('newRoom');
            expect(mockSocket.emit).toHaveBeenCalledWith('joinedRoom', expect.objectContaining(expectedRoom));
            expect(mockCallback).toHaveBeenCalledWith({ success: true, message: expect.any(String), room: expect.objectContaining(expectedRoom) });
        });

        it('should allow a player to join an existing, available room', () => {
            const roomId = 'existingRoom';
            const joinData = { roomId, username: 'Bob' };
            const existingPlayer = { id: 'pExisting', username: 'ExistingPlayer' } as Player;
            const roomToJoin = { 
                roomId, 
                players: [existingPlayer], 
                adminId: 'pExisting', 
                game: { ...defaultGame, state: 'waiting to start' as GameState, maxPlayers: 2 } 
            } as Room;
            const joiningPlayer = { id: mockSocket.id, username: 'Bob' } as Player;
            const roomAfterJoin = { ...roomToJoin, players: [existingPlayer, joiningPlayer] };

            (store.getRoom as jest.Mock).mockReturnValue(roomToJoin);
            (store.createNewPlayer as jest.Mock).mockReturnValue(joiningPlayer);
            (store.addPlayerToRoom as jest.Mock).mockReturnValue(roomAfterJoin);
            (store.checkAndSetReadyState as jest.Mock).mockReturnValue('ready' as GameState); // Simulate state change to ready

            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);

            expect(store.addPlayerToRoom).toHaveBeenCalledWith(roomId, joiningPlayer);
            expect(mockSocket.join).toHaveBeenCalledWith(roomId);
            expect(mockIo.to).toHaveBeenCalledWith(roomId); // For playerJoined and gameStateChanged
            expect(mockIo.emit).toHaveBeenCalledWith('playerJoined', { roomId, newPlayer: joiningPlayer });
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateChanged', { roomId, newState: 'ready' });
            expect(mockSocket.emit).toHaveBeenCalledWith('joinedRoom', roomAfterJoin);
            expect(mockCallback).toHaveBeenCalledWith({ success: true, message: expect.any(String), room: roomAfterJoin });
        });

        it('should prevent joining a full room', () => {
            const roomId = 'fullRoom';
            const joinData = { roomId, username: 'LateComer' };
            const playersInRoom = [{id: 'p1'}, {id: 'p2'}] as Player[];
            const fullRoom = { 
                roomId, 
                players: playersInRoom, 
                adminId: 'p1', 
                game: { ...defaultGame, maxPlayers: 2, state: 'ready' as GameState } 
            } as Room;

            (store.getRoom as jest.Mock).mockReturnValue(fullRoom);

            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('full') });
            expect(store.addPlayerToRoom).not.toHaveBeenCalled();
        });

        it('should prevent joining a room if game is in progress', () => {
            const roomId = 'gameInProgressRoom';
            const joinData = { roomId, username: 'WannaPlay' };
            const roomInProgress = { 
                roomId, 
                players: [{id: 'p1'} as Player], 
                adminId: 'p1', 
                game: { ...defaultGame, state: 'in game' as GameState } 
            } as Room;

            (store.getRoom as jest.Mock).mockReturnValue(roomInProgress);
            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('game is in game') });
        });
        
        it('should prevent joining a room if game is concluded', () => {
            const roomId = 'gameConcludedRoom';
            const joinData = { roomId, username: 'JustExploring' };
            const roomConcluded = { 
                roomId, 
                players: [{id: 'p1'} as Player], 
                adminId: 'p1', 
                game: { ...defaultGame, state: 'concluded' as GameState } 
            } as Room;

            (store.getRoom as jest.Mock).mockReturnValue(roomConcluded);
            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('game is concluded') });
        });

        it('should re-sync if player is already in the room', () => {
            const roomId = 'alreadyInRoom';
            const joinData = { roomId, username: defaultPlayer.username };
            const roomWithPlayer = { 
                roomId, 
                players: [defaultPlayer], // Player is already in the list
                adminId: defaultPlayer.id, 
                game: defaultGame 
            } as Room;
            
            (store.getRoom as jest.Mock).mockReturnValue(roomWithPlayer);
            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, joinData, mockCallback);

            expect(mockSocket.join).toHaveBeenCalledWith(roomId); // Should still rejoin socket room
            expect(mockSocket.emit).toHaveBeenCalledWith('joinedRoom', roomWithPlayer);
            expect(mockCallback).toHaveBeenCalledWith({ success: true, message: expect.stringContaining('already in room'), room: roomWithPlayer });
            expect(store.addPlayerToRoom).not.toHaveBeenCalled();
        });

        it('should fail with invalid roomId', () => {
            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, { roomId: '', username: 'Test'}, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: 'Invalid room ID provided.' });
        });
        
        it('should fail with invalid username (non-string)', () => {
            roomHandlers.handleJoinRoom(mockIo as SocketIOServer, mockSocket as Socket, { roomId: 'validRoom', username: 123 as any}, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: 'Invalid username provided.' });
        });
    });

    describe('handleLeaveRoom', () => {
        const roomId = 'roomToLeave';
        const playerLeaving = { id: 'socket123', username: 'Alice' } as Player; // Corresponds to mockSocket.id
        const otherPlayer = { id: 'p2', username: 'Bob' } as Player;

        it('should allow a player to leave a room, and assign new admin if admin leaves', () => {
            const roomBeforeLeave = { 
                roomId, 
                players: [playerLeaving, otherPlayer], 
                adminId: playerLeaving.id, 
                game: { state: 'waiting to start' } 
            } as Room;
            const roomAfterLeave = { ...roomBeforeLeave, players: [otherPlayer], adminId: otherPlayer.id };

            (store.removePlayerFromRoom as jest.Mock).mockReturnValue({ room: roomAfterLeave, playerLeft: playerLeaving });
            (store.checkAndSetReadyState as jest.Mock).mockReturnValue(null); // No state change from this

            roomHandlers.handleLeaveRoom(mockIo as SocketIOServer, mockSocket as Socket, roomId, mockCallback);

            expect(store.removePlayerFromRoom).toHaveBeenCalledWith(roomId, mockSocket.id);
            expect(mockSocket.leave).toHaveBeenCalledWith(roomId);
            expect(mockIo.to).toHaveBeenCalledWith(roomId);
            expect(mockIo.emit).toHaveBeenCalledWith('playerLeft', { roomId, playerId: mockSocket.id });
            expect(mockIo.emit).toHaveBeenCalledWith('newAdmin', { roomId, newAdminId: otherPlayer.id, newAdminUsername: otherPlayer.username });
            expect(mockSocket.emit).toHaveBeenCalledWith('leftRoom', roomId);
            expect(mockCallback).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
        });

        it('should delete room if last player leaves', () => {
            const roomBeforeLeave = { 
                roomId, 
                players: [playerLeaving], 
                adminId: playerLeaving.id, 
                game: { state: 'waiting to start' } 
            } as Room;
             // After player leaves, players array is empty
            const roomAfterLeave = { ...roomBeforeLeave, players: [] };


            (store.removePlayerFromRoom as jest.Mock).mockReturnValue({ room: roomAfterLeave, playerLeft: playerLeaving });
            (store.deleteRoom as jest.Mock).mockReturnValue(true); // Simulate successful deletion

            roomHandlers.handleLeaveRoom(mockIo as SocketIOServer, mockSocket as Socket, roomId, mockCallback);
            
            expect(store.deleteRoom).toHaveBeenCalledWith(roomId);
            expect(mockIo.emit).not.toHaveBeenCalledWith('newAdmin', expect.anything()); // No new admin if room deleted
            expect(mockSocket.emit).toHaveBeenCalledWith('leftRoom', roomId);
            expect(mockCallback).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
        });

        it('should handle player attempting to leave a room they are not in', () => {
            (store.removePlayerFromRoom as jest.Mock).mockReturnValue({ room: undefined, playerLeft: undefined });
            roomHandlers.handleLeaveRoom(mockIo as SocketIOServer, mockSocket as Socket, 'nonExistentRoom', mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('not in room') });
        });
        
        it('should emit gameStateChanged if checkAndSetReadyState returns a new state', () => {
            const roomBeforeLeave = { 
                roomId, 
                players: [playerLeaving, otherPlayer, {id: 'p3'} as Player], 
                adminId: otherPlayer.id, 
                game: { state: 'ready' } 
            } as Room;
             // After player leaves, players array is empty
            const roomAfterLeave = { ...roomBeforeLeave, players: [otherPlayer, {id: 'p3'} as Player] };

            (store.removePlayerFromRoom as jest.Mock).mockReturnValue({ room: roomAfterLeave, playerLeft: playerLeaving });
            (store.checkAndSetReadyState as jest.Mock).mockReturnValue('waiting to start' as GameState);

            roomHandlers.handleLeaveRoom(mockIo as SocketIOServer, mockSocket as Socket, roomId, mockCallback);

            expect(mockIo.emit).toHaveBeenCalledWith('gameStateChanged', { roomId, newState: 'waiting to start' });
        });
    });
    
    describe('handleDisconnect', () => {
        it('should trigger leave logic for all rooms a player was in', () => {
            const room1 = { roomId: 'r1', players: [{id: mockSocket.id}], adminId: mockSocket.id, game: {} } as Room;
            const room2 = { roomId: 'r2', players: [{id: mockSocket.id}], adminId: mockSocket.id, game: {} } as Room;
            
            (store.findRoomsBySocketId as jest.Mock).mockReturnValue([room1, room2]);
            // Simulate removePlayerFromRoom for room1 (becomes empty)
            (store.removePlayerFromRoom as jest.Mock)
                .mockImplementationOnce((roomIdArg, playerIdArg) => {
                    if (roomIdArg === 'r1') return { room: {...room1, players:[]}, playerLeft: {id: mockSocket.id} as Player};
                    return {room: undefined, playerLeft: undefined};
                })
                .mockImplementationOnce((roomIdArg, playerIdArg) => { // Simulate for room2 (also becomes empty)
                     if (roomIdArg === 'r2') return { room: {...room2, players:[]}, playerLeft: {id: mockSocket.id} as Player};
                    return {room: undefined, playerLeft: undefined};
                });
            (store.deleteRoom as jest.Mock).mockReturnValue(true);

            roomHandlers.handleDisconnect(mockIo as SocketIOServer, mockSocket as Socket);
            
            expect(store.findRoomsBySocketId).toHaveBeenCalledWith(mockSocket.id);
            expect(store.removePlayerFromRoom).toHaveBeenCalledTimes(2);
            expect(store.removePlayerFromRoom).toHaveBeenCalledWith('r1', mockSocket.id);
            expect(store.removePlayerFromRoom).toHaveBeenCalledWith('r2', mockSocket.id);
            expect(store.deleteRoom).toHaveBeenCalledTimes(2); // Both rooms deleted
            expect(mockSocket.leave).toHaveBeenCalledTimes(2); // Called for each room
        });

        it('should do nothing if disconnected player was not in any rooms', () => {
            (store.findRoomsBySocketId as jest.Mock).mockReturnValue([]);
            roomHandlers.handleDisconnect(mockIo as SocketIOServer, mockSocket as Socket);
            expect(store.removePlayerFromRoom).not.toHaveBeenCalled();
            expect(store.deleteRoom).not.toHaveBeenCalled();
        });
    });
});
