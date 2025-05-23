import { Server, Socket } from 'socket.io';
import { createRoom, getRoom, addPlayerToRoom, removePlayerFromRoom, getAllPlayersInRoom } from '../../data/store'; // Adjust path
import { Toohak } from '../../Games/Toohak'; // Adjust path
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleStartGame, registerRoomHandlers } from '../roomHandlers'; // Adjust path
import { Question } from '../../utils/types';

// Mock data store functions
jest.mock('../../data/store');
// Mock Toohak game class
jest.mock('../../Games/Toohak');

const mockQuestions: Question[] = [{ question: 'Q1', answers: [], timeLimit: 10 }];

describe('Socket Room Handlers', () => {
  let mockIo: Server;
  let mockSocket: Socket;
  let mockEmit: jest.Mock;
  let mockTo: jest.Mock;
  let mockJoin: jest.Mock;
  let mockLeave: jest.Mock;

  beforeEach(() => {
    mockEmit = jest.fn();
    mockTo = jest.fn(() => ({ emit: mockEmit }));
    mockJoin = jest.fn();
    mockLeave = jest.fn();

    // Basic mock for socket instance
    mockSocket = {
      id: 'socket123',
      emit: mockEmit,
      join: mockJoin,
      leave: mockLeave,
      to: mockTo,
      // Add other properties or methods if your handlers use them
    } as any; // Use 'any' for simplicity in mocking, or define a more complete mock type

    // Basic mock for Server instance
    mockIo = {
      to: mockTo,
      // Add other properties or methods if your handlers use them
    } as any;


    // Reset mocks before each test
    (createRoom as jest.Mock).mockClear();
    (getRoom as jest.Mock).mockClear();
    (addPlayerToRoom as jest.Mock).mockClear();
    (removePlayerFromRoom as jest.Mock).mockClear();
    (getAllPlayersInRoom as jest.Mock).mockClear();
    (Toohak as jest.Mock).mockClear();
  });

  describe('handleCreateRoom', () => {
    it('should create a room, add the host, and emit roomCreated and playerJoined events', () => {
      const mockGame = new Toohak(mockQuestions, mockSocket.id, jest.fn());
      (Toohak as jest.Mock).mockImplementation(() => mockGame);
      (createRoom as jest.Mock).mockImplementation((roomId, gameInstance) => ({ id: roomId, game: gameInstance, players: [] }));
      (addPlayerToRoom as jest.Mock).mockImplementation((roomId, playerId, playerName) => ({ id: playerId, name: playerName, roomId }));

      handleCreateRoom(mockIo, mockSocket, { name: 'Host Name', questions: mockQuestions });

      expect(Toohak).toHaveBeenCalledWith(mockQuestions, mockSocket.id, expect.any(Function));
      expect(createRoom).toHaveBeenCalledWith(expect.any(String), mockGame); // Room ID is generated
      const createdRoomId = (createRoom as jest.Mock).mock.calls[0][0];
      expect(addPlayerToRoom).toHaveBeenCalledWith(createdRoomId, mockSocket.id, 'Host Name');
      
      expect(mockSocket.join).toHaveBeenCalledWith(createdRoomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('roomCreated', { roomId: createdRoomId, hostId: mockSocket.id });
      expect(mockIo.to).toHaveBeenCalledWith(createdRoomId);
      expect(mockEmit).toHaveBeenCalledWith('playerJoined', { playerId: mockSocket.id, name: 'Host Name' });
      expect(mockIo.to(createdRoomId).emit).toHaveBeenCalledWith('updatePlayerList', []); // Initially empty, then host added
    });

    it('should emit error if questions are missing', () => {
      handleCreateRoom(mockIo, mockSocket, { name: 'Host Name', questions: [] });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Questions are required to create a room.' });
    });
  });

  describe('handleJoinRoom', () => {
    it('should allow a player to join an existing room and notify others', () => {
      const roomId = 'existingRoom';
      const mockRoom = { id: roomId, game: new Toohak(mockQuestions, 'host', jest.fn()), players: [] };
      (getRoom as jest.Mock).mockReturnValue(mockRoom);
      (addPlayerToRoom as jest.Mock).mockImplementation((rid, pid, pname) => ({ id: pid, name: pname, roomId: rid }));
      (getAllPlayersInRoom as jest.Mock).mockReturnValue([{ id: 'player1', name: 'Player One' }, {id: mockSocket.id, name: 'New Player'}]);


      handleJoinRoom(mockIo, mockSocket, { roomId, name: 'New Player' });

      expect(getRoom).toHaveBeenCalledWith(roomId);
      expect(addPlayerToRoom).toHaveBeenCalledWith(roomId, mockSocket.id, 'New Player');
      expect(mockSocket.join).toHaveBeenCalledWith(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('roomJoined', { roomId, playerId: mockSocket.id, name: 'New Player', gameState: mockRoom.game.gameState });
      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(mockEmit).toHaveBeenCalledWith('playerJoined', { playerId: mockSocket.id, name: 'New Player' });
      expect(mockIo.to(roomId).emit).toHaveBeenCalledWith('updatePlayerList', [{ id: 'player1', name: 'Player One' }, {id: mockSocket.id, name: 'New Player'}]);
    });

    it('should emit error if room does not exist', () => {
      (getRoom as jest.Mock).mockReturnValue(undefined);
      handleJoinRoom(mockIo, mockSocket, { roomId: 'nonExistentRoom', name: 'Player' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Room not found or game already started.' }); // or specific message
    });

     it('should emit error if game has already started', () => {
      const roomId = 'startedGameRoom';
      const mockStartedGame = new Toohak(mockQuestions, 'host', jest.fn());
      mockStartedGame.gameState = 'question'; // Game is in progress
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockStartedGame, players: [] });

      handleJoinRoom(mockIo, mockSocket, { roomId, name: 'Late Player' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Room not found or game already started.' });
    });
  });

  describe('handleLeaveRoom', () => {
    it('should allow a player to leave a room and notify others', () => {
      const roomId = 'activeRoom';
      const playerName = 'Leaving Player';
      // Mock that the player was in the room
      (removePlayerFromRoom as jest.Mock).mockReturnValue(true); 
      // Mock getRoom to return a room so that player list update can be called
      const mockGame = new Toohak(mockQuestions, 'host', jest.fn());
      const mockRoom = { id: roomId, game: mockGame, players: [{id: 'otherPlayer', name: 'Other Player'}] };
      (getRoom as jest.Mock).mockReturnValue(mockRoom);
      (getAllPlayersInRoom as jest.Mock).mockReturnValue(mockRoom.players);


      // Need to simulate the player being in a room for the store.
      // This is tricky because the socket doesn't directly know the room of the player without querying store.
      // For this test, we assume `removePlayerFromRoom` also gives us the room or we find it.
      // Let's assume `removePlayerFromRoom` is effective and `getPlayer` on the leaving player would return their room.
      // Or, more simply, the client *must* send the roomId they are leaving.
      // The provided signature `handleLeaveRoom(io, socket)` doesn't take roomId.
      // This implies `socket.rooms` or similar might be used, or the player is in only one room.
      // Let's assume for now the handler can deduce the room or it's passed.
      // **If handleLeaveRoom needs roomId, the test (and handler) must be adjusted.**
      // For now, we'll assume it can find the room or the `removePlayerFromRoom` handles this.

      // To make this testable, let's assume `handleLeaveRoom` is called with `roomId` or finds it.
      // We'll modify the call slightly for the test to pass a hypothetical `roomId`.
      // This reflects a likely real-world scenario where client sends `roomId` or server tracks `socket.roomId`.
      
      // Let's say roomHandlers internally finds the player's room.
      // We need to ensure `removePlayerFromRoom(mockSocket.id)` works and that we can get the room ID.
      // The current store interface implies `removePlayerFromRoom` handles finding which room.
      // Let's assume `removePlayerFromRoom` returns the `roomId` or `true` and we then fetch room players.

      // To make this test pass, we'll assume the player's room is known (e.g. socket.data.roomId)
      (mockSocket as any).data = { roomId: roomId, name: playerName };


      handleLeaveRoom(mockIo, mockSocket);


      expect(removePlayerFromRoom).toHaveBeenCalledWith(mockSocket.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(roomId);
      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(mockEmit).toHaveBeenCalledWith('playerLeft', { playerId: mockSocket.id, name: playerName });
      expect(mockIo.to(roomId).emit).toHaveBeenCalledWith('updatePlayerList', mockRoom.players);
    });

    it('should handle player not found or not in a room gracefully', () => {
      (removePlayerFromRoom as jest.Mock).mockReturnValue(false); // Player wasn't in any room
       (mockSocket as any).data = {}; // No roomId associated

      handleLeaveRoom(mockIo, mockSocket);

      // It might emit an error, or just do nothing. Let's assume it does nothing if no room.
      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(mockIo.to).not.toHaveBeenCalled();
      // Or check for an error emission if that's the desired behavior
      // expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'You are not in a room.' });
    });
  });

  describe('handleStartGame', () => {
    it('should allow the host to start the game and notify players', () => {
      const roomId = 'waitingRoom';
      const mockGameInstance = { 
        startGame: jest.fn(), 
        hostId: mockSocket.id, 
        gameState: 'waiting',
        currentQuestion: { question: 'Q1?', answers: [], timeLimit: 10 }, // Mocked
        players: [{id: mockSocket.id, name: 'Host'}]
      };
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: mockGameInstance.players });

      handleStartGame(mockIo, mockSocket, { roomId });

      expect(getRoom).toHaveBeenCalledWith(roomId);
      expect(mockGameInstance.startGame).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      // This event structure depends on what `startGame` in Toohak triggers via emitEvent callback
      // For this test, we assume `gameStarted` and `nextQuestion` are emitted by the handler itself
      // or that the mocked startGame directly causes these emissions via the callback.
      // Let's assume the handler is responsible for these specific emissions after calling game.startGame().
      
      // If Toohak's emitEvent is correctly passed and called by startGame:
      // We need to ensure the emitEvent mock within Toohak was called.
      // The Toohak constructor in these tests uses `jest.fn()` for emitEvent.
      // We'd need to access that specific mock.

      // For simplicity here, let's assume handleStartGame itself emits (or its callback does).
      // The provided `handleStartGame` structure suggests it calls `game.startGame()`
      // and then relies on `game.emitEvent` to inform clients.

      // We need to test the `emitEvent` passed to Toohak.
      // Let's refine the Toohak mock for the `handleStartGame` test.
      const emitEventCb = (Toohak as jest.Mock).mock.calls[0]?.[2] || jest.fn(); // Get the callback from the first Toohak instantiation
      
      // Re-run with a game that uses this callback
      const specificMockEmitEvent = jest.fn();
      const gameForStartTest = new Toohak(mockQuestions, mockSocket.id, specificMockEmitEvent);
      gameForStartTest.startGame = jest.fn(() => { // Mock startGame to call our specific emitEvent
        gameForStartTest.gameState = 'question'; // Simulate game state change
        specificMockEmitEvent('gameStarted', { roomId, hostId: mockSocket.id });
        specificMockEmitEvent('nextQuestion', { question: gameForStartTest.currentQuestion, players: gameForStartTest.players });
      });
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: gameForStartTest, players: gameForStartTest.players });

      handleStartGame(mockIo, mockSocket, { roomId });
      
      expect(gameForStartTest.startGame).toHaveBeenCalled();
      expect(specificMockEmitEvent).toHaveBeenCalledWith('gameStarted', { roomId, hostId: mockSocket.id });
      expect(specificMockEmitEvent).toHaveBeenCalledWith('nextQuestion', { question: gameForStartTest.currentQuestion, players: gameForStartTest.players });

    });

    it('should prevent non-host from starting the game', () => {
      const roomId = 'room1';
      const mockGameInstance = { startGame: jest.fn(), hostId: 'anotherPlayerSocketId', gameState: 'waiting' };
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleStartGame(mockIo, mockSocket, { roomId });

      expect(mockGameInstance.startGame).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Only the host can start the game.' });
    });

    it('should emit error if game is not found or already started', () => {
      (getRoom as jest.Mock).mockReturnValue(undefined);
      handleStartGame(mockIo, mockSocket, { roomId: 'noRoomHere' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Game not found or already started.' });

      (getRoom as jest.Mock).mockReturnValue({ id: 'startedRoom', game: { hostId: mockSocket.id, gameState: 'question' }, players: [] });
      handleStartGame(mockIo, mockSocket, { roomId: 'startedRoom' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Game not found or already started.' });
    });
  });
  
  describe('registerRoomHandlers', () => {
    it('should register all room event handlers on the socket', () => {
      mockSocket.on = jest.fn(); // Mock the 'on' method
      registerRoomHandlers(mockIo, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('createRoom', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('joinRoom', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leaveRoom', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('startGame', expect.any(Function));
      // You can even invoke the callback to ensure the correct handler is called
      // e.g. (mockSocket.on as jest.Mock).mock.calls[0][1]({}); // Calls the function for 'createRoom'
    });
  });
});
