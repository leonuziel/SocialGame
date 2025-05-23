// server2/src/data/__tests__/store.spec.ts
import {
    createNewGame,
    createNewPlayer,
    addRoom,
    getRoom,
    getAllRooms,
    deleteRoom,
    addPlayerToRoom,
    removePlayerFromRoom,
    findRoomsBySocketId,
    getPlayerInRoom,
    updateGameState,
    checkAndSetReadyState,
    createAndAssignGameInstance,
    // _clearActiveRoomsForTesting, // This is not exported, handled by local clearRooms
} from '../store';
import { GameType } from '../../Games/GameUtils';
import { Player, Room, GameState, Game } from '../models';
import { IGame, GameInitializationOptions } from '../../Games/IGame'; // PlayerActionPayload not directly used by store fns
import { ToohakGame } from '../../Games/Toohak'; 
import { Server as SocketIOServer } from 'socket.io';
import { MIN_PLAYERS_DEFAULT } from '../../config'; // Import for minPlayers assertion

// Mock the ToohakGame class
jest.mock('../../Games/Toohak', () => {
    return {
        ToohakGame: jest.fn().mockImplementation((roomId: string, playerIds: string[], adminIds: string[], io: SocketIOServer) => {
            const mockGameInstance: IGame = {
                roomId,
                gameType: GameType.Toohak,
                initialize: jest.fn(),
                startGameCycle: jest.fn(),
                concludeGame: jest.fn(),
                handlePlayerAction: jest.fn(),
                getGameStateForClient: jest.fn(() => ({
                    // Provide a structure that matches what getGameStateForClient might return
                    status: 'waiting to start' as GameState, 
                    // ... other relevant properties for client state
                })),
                getInternalGameData: jest.fn(() => ({ 
                    generalData: { status: 'waiting to start' as GameState, questionIndex: -1, currentQuestion: 0, questionData: {} }, 
                    playerData: {} 
                })),
                getCurrentState: jest.fn(() => 'waiting to start' as GameState),
            };
            // This part is to simulate how ToohakGame might set its internal gameData upon construction or early init
            // This is used by createAndAssignGameInstance to set the room's generic game state.
            (mockGameInstance as any).gameData = { 
                generalData: { status: 'waiting to start' as GameState }, // Simulate initial state before specific logic in createAndAssignGameInstance for Toohak
            };
            return mockGameInstance;
        }),
    };
});


// Helper to clear activeRooms before each test for isolation
const clearRooms = () => {
    const rooms = getAllRooms();
    // Iterate backwards to avoid issues with modifying array while looping
    for (let i = rooms.length - 1; i >= 0; i--) {
        deleteRoom(rooms[i].roomId);
    }
};


describe('Game Store Logic', () => {
    let mockIo: SocketIOServer;

    beforeEach(() => {
        clearRooms(); // Clear active rooms before each test
        // Create a new mock for SocketIOServer before each test to ensure isolation
        // Basic mock, can be expanded if specific io interactions need to be asserted from store.ts
        mockIo = new SocketIOServer() as jest.Mocked<SocketIOServer>; 
    });

    describe('createNewGame', () => {
        it('should create a game with default waiting state and specified game type', () => {
            const game = createNewGame(GameType.Toohak, 4);
            expect(game.gameType).toBe(GameType.Toohak);
            expect(game.state).toBe('waiting to start');
            expect(game.maxPlayers).toBe(4);
            expect(game.minPlayers).toBe(MIN_PLAYERS_DEFAULT); // Assuming MIN_PLAYERS_DEFAULT is used
            expect(game.currentRound).toBe(0);
            expect(game.playerScores).toEqual({});
            expect(game.playerAnswerStatuses).toEqual({});
        });
    });

    describe('createNewPlayer', () => {
        it('should create a player with given id and username', () => {
            const player = createNewPlayer('socket1', 'Alice');
            expect(player.id).toBe('socket1');
            expect(player.username).toBe('Alice');
        });
        it('should create a player with a default username if none provided', () => {
            const player = createNewPlayer('socket2');
            expect(player.id).toBe('socket2');
            expect(player.username).toBe('Player_sock'); // Based on substring(0,4)
        });
    });

    describe('Room Management', () => {
        let sampleRoom: Room;
        beforeEach(() => {
            sampleRoom = {
                roomId: 'room123',
                players: [],
                game: createNewGame(GameType.None, 2),
                adminId: 'adminUser',
            };
        });

        it('should add and get a room', () => {
            addRoom(sampleRoom);
            const room = getRoom('room123');
            expect(room).toBeDefined();
            expect(room?.roomId).toBe('room123');
        });

        it('should return all rooms', () => {
            addRoom(sampleRoom);
            const rooms = getAllRooms();
            expect(rooms.length).toBe(1);
            expect(rooms[0].roomId).toBe('room123');
        });
        
        it('should delete a room', () => {
            addRoom(sampleRoom);
            deleteRoom('room123');
            expect(getRoom('room123')).toBeUndefined();
            expect(getAllRooms().length).toBe(0);
        });

        it('should not throw when trying to add an existing room, but log a warning (manual check)', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            addRoom(sampleRoom);
            addRoom(sampleRoom); // Add same room again
            expect(consoleWarnSpy).toHaveBeenCalledWith(`[Store] Attempted to add existing room: ${sampleRoom.roomId}`);
            expect(getAllRooms().length).toBe(1); // Should still be one
            consoleWarnSpy.mockRestore();
        });
    });

    describe('Player Management in Rooms', () => {
        let roomWithPlayers: Room;
        let player1: Player;
        let player2: Player;

        beforeEach(() => {
            player1 = createNewPlayer('p1', 'PlayerOne');
            player2 = createNewPlayer('p2', 'PlayerTwo');
            roomWithPlayers = {
                roomId: 'playerRoom',
                players: [],
                game: createNewGame(GameType.None, 2),
                adminId: 'p1',
            };
            addRoom(roomWithPlayers);
        });

        it('should add a player to a room', () => {
            addPlayerToRoom('playerRoom', player1);
            const room = getRoom('playerRoom');
            expect(room?.players.length).toBe(1);
            expect(room?.players[0].id).toBe('p1');
        });
        
        it('should not add a player if they already exist in the room', () => {
            addPlayerToRoom('playerRoom', player1);
            addPlayerToRoom('playerRoom', player1); // Try adding again
            const room = getRoom('playerRoom');
            expect(room?.players.length).toBe(1);
        });


        it('should remove a player from a room', () => {
            addPlayerToRoom('playerRoom', player1);
            addPlayerToRoom('playerRoom', player2);
            const result = removePlayerFromRoom('playerRoom', 'p1');
            const room = getRoom('playerRoom');
            expect(room?.players.length).toBe(1);
            expect(room?.players[0].id).toBe('p2');
            expect(result.playerLeft?.id).toBe('p1');
        });
        
        it('should return undefined for playerLeft if player not found during removal', () => {
            const result = removePlayerFromRoom('playerRoom', 'pNonExistent');
            expect(result.playerLeft).toBeUndefined();
        });

        it('should find rooms by socket ID', () => {
            addPlayerToRoom('playerRoom', player1);
            const foundRooms = findRoomsBySocketId('p1');
            expect(foundRooms.length).toBe(1);
            expect(foundRooms[0].roomId).toBe('playerRoom');
        });

        it('should get a player in a room', () => {
            addPlayerToRoom('playerRoom', player1);
            const foundPlayer = getPlayerInRoom('playerRoom', 'p1');
            expect(foundPlayer).toBeDefined();
            expect(foundPlayer?.username).toBe('PlayerOne');
        });
    });
    
    describe('Game State Management', () => {
        let roomForStateTests: Room;
         beforeEach(() => {
            roomForStateTests = {
                roomId: 'gameStateRoom',
                players: [],
                game: createNewGame(GameType.None, 2), // minPlayers will be MIN_PLAYERS_DEFAULT
                adminId: 'admin'
            };
            addRoom(roomForStateTests);
        });

        it('should update game state', () => {
            updateGameState('gameStateRoom', { state: 'in game', currentRound: 1 });
            const room = getRoom('gameStateRoom');
            expect(room?.game.state).toBe('in game');
            expect(room?.game.currentRound).toBe(1);
        });

        it('checkAndSetReadyState should set to "ready" if enough players (minPlayers default)', () => {
            // Assuming MIN_PLAYERS_DEFAULT is 2 for this test to pass
            for (let i = 0; i < MIN_PLAYERS_DEFAULT; i++) {
                addPlayerToRoom('gameStateRoom', createNewPlayer(`p${i}`));
            }
            const room = getRoom('gameStateRoom')!; // room is guaranteed to exist
            checkAndSetReadyState(room);
            expect(room.game.state).toBe('ready');
        });
        
        it('checkAndSetReadyState should set to "waiting to start" if not enough players', () => {
            if (MIN_PLAYERS_DEFAULT > 1) { // Only makes sense if min players > 1
                 addPlayerToRoom('gameStateRoom', createNewPlayer('p1'));
            }
            const room = getRoom('gameStateRoom')!;
            checkAndSetReadyState(room); 
            expect(room.game.state).toBe('waiting to start');
        });

        it('checkAndSetReadyState should not change state if game is "in game"', () => {
            updateGameState('gameStateRoom', { state: 'in game' });
            for (let i = 0; i < MIN_PLAYERS_DEFAULT; i++) {
                addPlayerToRoom('gameStateRoom', createNewPlayer(`p${i}`));
            }
            const room = getRoom('gameStateRoom')!;
            checkAndSetReadyState(room);
            expect(room.game.state).toBe('in game'); // Should remain 'in game'
        });
    });

    describe('createAndAssignGameInstance', () => {
        let roomForGameInstance: Room;
        let playersInRoom: Player[];

        beforeEach(() => {
            playersInRoom = [createNewPlayer('adminP', 'Admin'), createNewPlayer('playerP', 'Player')];
            roomForGameInstance = {
                roomId: 'gameInstanceRoom',
                players: playersInRoom,
                game: createNewGame(GameType.None, 2), 
                adminId: 'adminP',
            };
            addRoom(roomForGameInstance);
        });

        it('should create and assign a ToohakGame instance', () => {
            const gameOptions: GameInitializationOptions = { adminIds: ['adminP'] };
            const playerIds = playersInRoom.map(p => p.id);

            const updatedRoom = createAndAssignGameInstance(
                'gameInstanceRoom',
                GameType.Toohak,
                playersInRoom,
                'adminP',
                mockIo, 
                gameOptions
            );

            expect(updatedRoom).toBeDefined();
            expect(updatedRoom?.gameInstance).toBeDefined();
            expect(updatedRoom?.gameInstance?.gameType).toBe(GameType.Toohak);
            
            // Check if the ToohakGame constructor (mock) was called with expected params
            // The constructor in store.ts is: new ToohakGame(roomId, playerIds, [adminId], io)
            expect(ToohakGame).toHaveBeenCalledWith('gameInstanceRoom', playerIds, ['adminP'], mockIo);
            
            // Check if the generic game state on the room was updated
            expect(updatedRoom?.game.gameType).toBe(GameType.Toohak);
            
            // The mock's getCurrentState returns 'waiting to start'.
            // createAndAssignGameInstance for Toohak specifically sets room.game.state to "in game".
            expect(updatedRoom?.game.state).toBe('in game'); 
        });

        it('should return undefined for an unknown game type', () => {
            const updatedRoom = createAndAssignGameInstance(
                'gameInstanceRoom',
                'UnknownGameType' as GameType, // Cast for test
                playersInRoom,
                'adminP',
                mockIo
            );
            expect(updatedRoom).toBeUndefined();
        });
    });
});
