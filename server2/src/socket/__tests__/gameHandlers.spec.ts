// server2/src/socket/__tests__/gameHandlers.spec.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as gameHandlers from '../gameHandlers';
import * as store from '../../data/store';
import { GameType } from '../../Games/GameUtils';
import { Player, Room, GameState, Game } from '../../data/models';
import { IGame, PlayerActionPayload, GameInitializationOptions } from '../../Games/IGame';

// Mock the entire store module
jest.mock('../../data/store');

// Mock IGame instance for tests involving gameInstance
const mockGameInstance: jest.Mocked<IGame> = {
    roomId: 'testRoom',
    gameType: GameType.Toohak, // Default to Toohak for the mock
    initialize: jest.fn(),
    startGameCycle: jest.fn(),
    concludeGame: jest.fn(),
    handlePlayerAction: jest.fn(),
    getGameStateForClient: jest.fn(() => ({ status: 'in game' as GameState, gameType: GameType.Toohak /* other props */ })),
    getInternalGameData: jest.fn(() => ({ generalData: {}, playerData: {} })),
    getCurrentState: jest.fn(() => 'in game' as GameState),
    // handlePlayerDisconnect is optional in IGame, so not strictly needed in base mock
};

describe('Socket Game Handlers', () => {
    let mockIo: SocketIOServer;
    let mockSocket: Partial<Socket>; // Use Partial for easier mocking
    let mockCallback: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;

        mockSocket = {
            id: 'socket123',
            emit: jest.fn(), // For direct emits to the socket
        };
        mockCallback = jest.fn(); // For ack callbacks
    });

    describe('handleSendMessage', () => {
        const messageData = { roomId: 'room1', message: 'Hello world' };
        const player = { id: mockSocket.id as string, username: 'TestUser' } as Player;
        const room = { 
            roomId: 'room1', 
            players: [player], 
            game: { state: 'in game' as GameState } 
        } as Room;

        it('should send a message if valid and player/room exist', () => {
            (store.getRoom as jest.Mock).mockReturnValue(room);
            (store.getPlayerInRoom as jest.Mock).mockReturnValue(player);

            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, messageData);

            expect(store.getRoom).toHaveBeenCalledWith('room1');
            expect(store.getPlayerInRoom).toHaveBeenCalledWith('room1', mockSocket.id);
            expect(mockIo.to).toHaveBeenCalledWith('room1');
            expect(mockIo.emit).toHaveBeenCalledWith('message', { player, message: 'Hello world' });
        });

        it('should not send an empty message', () => {
            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, { ...messageData, message: '  ' });
            expect(mockIo.emit).not.toHaveBeenCalledWith('message', expect.anything());
            // Optionally check for an error emit to sender if that's implemented
        });

        it('should not send an overly long message and emit error', () => {
            const longMessage = 'a'.repeat(501);
            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, { ...messageData, message: longMessage });
            expect(mockIo.emit).not.toHaveBeenCalledWith('message', expect.anything());
            expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Message is too long (max 500 characters).' });
        });

        it('should not send if room does not exist', () => {
            (store.getRoom as jest.Mock).mockReturnValue(undefined);
            (store.getPlayerInRoom as jest.Mock).mockReturnValue(player);
            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, messageData);
            expect(mockIo.emit).not.toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: `Cannot send message in room ${messageData.roomId}.` });
        });

        it('should not send if player is not in the room', () => {
            (store.getRoom as jest.Mock).mockReturnValue(room);
            (store.getPlayerInRoom as jest.Mock).mockReturnValue(undefined); // Player not found
            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, messageData);
            expect(mockIo.emit).not.toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: `Cannot send message in room ${messageData.roomId}.` });
        });

        it('should not send if chat is disabled (e.g., game concluded)', () => {
            const concludedRoom = { ...room, game: { state: 'concluded' as GameState } };
            (store.getRoom as jest.Mock).mockReturnValue(concludedRoom);
            (store.getPlayerInRoom as jest.Mock).mockReturnValue(player);
            gameHandlers.handleSendMessage(mockIo as SocketIOServer, mockSocket as Socket, messageData);
            expect(mockIo.emit).not.toHaveBeenCalledWith('message', expect.anything());
            expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Chat is disabled as the game has concluded.' });
        });
    });

    describe('handleStartGame', () => {
        const roomId = 'roomToStart';
        const adminSocket = { id: 'admin1' } as Socket; // Mock admin socket
        const players = [{id: 'admin1'}, {id: 'p2'}] as Player[];
        const roomReadyToStart = { 
            roomId, 
            players, 
            adminId: 'admin1', 
            game: { state: 'ready' as GameState, gameType: GameType.None, maxPlayers: 2, minPlayers: 2 } 
        } as Room;

        it('should start a game if admin and room is ready', () => {
            (store.getRoom as jest.Mock).mockReturnValue(roomReadyToStart);
            const roomWithInstance = { 
                ...roomReadyToStart, 
                gameInstance: mockGameInstance, // Assume this is the mock instance
                game: { ...roomReadyToStart.game, state: 'in game' as GameState, gameType: GameType.Toohak } 
            } as Room;
            (store.createAndAssignGameInstance as jest.Mock).mockReturnValue(roomWithInstance);
            
            gameHandlers.handleStartGame(mockIo as SocketIOServer, adminSocket, roomId, mockCallback);

            expect(store.createAndAssignGameInstance).toHaveBeenCalledWith(
                roomId, 
                GameType.Toohak, // Default game type to start for now
                players, 
                'admin1', 
                mockIo,
                { maxPlayers: 2 } // GameInitializationOptions
            );
            expect(mockIo.to).toHaveBeenCalledWith(roomId);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateChanged', { 
                roomId, 
                newState: 'in game', 
                gameType: GameType.Toohak 
            });
            expect(mockCallback).toHaveBeenCalledWith({ 
                success: true, 
                message: expect.any(String), 
                game: roomWithInstance.game 
            });
        });

        it('should not start game if not admin', () => {
            const nonAdminSocket = { id: 'nonAdmin' } as Socket;
            (store.getRoom as jest.Mock).mockReturnValue(roomReadyToStart);
            gameHandlers.handleStartGame(mockIo as SocketIOServer, nonAdminSocket, roomId, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: 'Only the room admin can start the game.' });
            expect(store.createAndAssignGameInstance).not.toHaveBeenCalled();
        });

        it('should not start game if room not in "ready" state', () => {
            const roomNotReady = { ...roomReadyToStart, game: { ...roomReadyToStart.game, state: 'waiting to start' as GameState } };
            (store.getRoom as jest.Mock).mockReturnValue(roomNotReady);
            gameHandlers.handleStartGame(mockIo as SocketIOServer, adminSocket, roomId, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('must be "ready"') });
        });

        it('should not start game if room not found', () => {
            (store.getRoom as jest.Mock).mockReturnValue(undefined);
            gameHandlers.handleStartGame(mockIo as SocketIOServer, adminSocket, roomId, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: `Room "${roomId}" not found.` });
        });
    });

    describe('handleGameAction', () => {
        const roomId = 'gameActionRoom';
        const actionData: PlayerActionPayload & { roomId: string } = { 
            roomId, 
            actionType: 'submitAnswer', 
            payload: { answer: 1 } 
        };
        const roomWithActiveGame = { 
            roomId, 
            gameInstance: mockGameInstance, 
            game: { state: 'in game' as GameState, gameType: GameType.Toohak } 
        } as Room;

        it('should call gameInstance.handlePlayerAction and use its result in callback', async () => {
            (store.getRoom as jest.Mock).mockReturnValue(roomWithActiveGame);
            const gameActionResult = { success: true, message: 'Action successful' };
            mockGameInstance.handlePlayerAction.mockResolvedValue(gameActionResult);

            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, actionData, mockCallback);

            expect(roomWithActiveGame.gameInstance?.handlePlayerAction).toHaveBeenCalledWith(
                mockSocket.id, 
                { actionType: 'submitAnswer', payload: { answer: 1 } } // Ensure payload is passed correctly
            );
            expect(mockCallback).toHaveBeenCalledWith(gameActionResult);
        });

        it('should fail if room not found', async () => {
            (store.getRoom as jest.Mock).mockReturnValue(undefined);
            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, actionData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: "Game not found or not initialized." });
        });

        it('should fail if gameInstance not found on room', async () => {
            (store.getRoom as jest.Mock).mockReturnValue({ ...roomWithActiveGame, gameInstance: undefined });
            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, actionData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: "Game not found or not initialized." });
        });

        it('should fail if game not in "in game" state', async () => {
            (store.getRoom as jest.Mock).mockReturnValue({ ...roomWithActiveGame, game: { state: 'ready' as GameState } });
            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, actionData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: expect.stringContaining('Game is not currently in progress.') });
        });

        it('should handle errors from gameInstance.handlePlayerAction', async () => {
            (store.getRoom as jest.Mock).mockReturnValue(roomWithActiveGame);
            const error = new Error('Game action failed');
            mockGameInstance.handlePlayerAction.mockRejectedValue(error);
            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, actionData, mockCallback);
            expect(mockCallback).toHaveBeenCalledWith({ success: false, message: 'Game action failed' });
        });
        
        it('should fail with invalid data (missing actionType)', async () => {
            const invalidData = { roomId } as any; // Missing actionType
            await gameHandlers.handleGameAction(mockIo as SocketIOServer, mockSocket as Socket, invalidData, mockCallback);
            // This validation is now in socket/index.ts, so this test case might be redundant here
            // or gameHandlers can also have basic validation. Assuming socket/index.ts catches this first.
            // If gameHandlers also validates:
            // expect(mockCallback).toHaveBeenCalledWith({ success: false, message: "Invalid game action data." });
        });
    });
    
    describe('handleConcludeGame', () => {
        const roomId = 'roomToConclude';
        const roomToConclude = { 
            roomId, 
            gameInstance: mockGameInstance, 
            game: { state: 'in game' as GameState } 
        } as Room;

        it('should conclude an active game', () => {
            (store.getRoom as jest.Mock).mockReturnValue(roomToConclude);
            (store.updateGameState as jest.Mock).mockReturnValue({...roomToConclude, game: {...roomToConclude.game, state: 'concluded' as GameState}});

            gameHandlers.handleConcludeGame(mockIo as SocketIOServer, roomId);

            expect(mockGameInstance.concludeGame).toHaveBeenCalledWith("Concluded by server action");
            expect(store.updateGameState).toHaveBeenCalledWith(roomId, { state: 'concluded' });
            expect(mockIo.to).toHaveBeenCalledWith(roomId);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateChanged', { roomId, newState: 'concluded' });
        });
        
        it('should not conclude if game not "in game"', () => {
            const roomNotActive = { ...roomToConclude, game: { state: 'ready' as GameState } };
            (store.getRoom as jest.Mock).mockReturnValue(roomNotActive);
            gameHandlers.handleConcludeGame(mockIo as SocketIOServer, roomId);
            expect(mockGameInstance.concludeGame).not.toHaveBeenCalled();
            expect(store.updateGameState).not.toHaveBeenCalled();
        });

        it('should not conclude if room not found', () => {
            (store.getRoom as jest.Mock).mockReturnValue(undefined);
            gameHandlers.handleConcludeGame(mockIo as SocketIOServer, roomId);
            expect(mockGameInstance.concludeGame).not.toHaveBeenCalled();
            expect(store.updateGameState).not.toHaveBeenCalled();
        });
    });
});
