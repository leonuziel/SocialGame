import { Server, Socket } from 'socket.io';
import { getRoom, updateGameState } from '../../data/store'; // Adjust path
import { Toohak } from '../../Games/Toohak'; // Adjust path
import { handleSubmitAnswer, handleNextQuestion, registerGameHandlers } from '../gameHandlers'; // Adjust path
import { Question } from '../../utils/types';

// Mock data store functions
jest.mock('../../data/store');
// Mock Toohak game class - its methods will be jest.fn()
jest.mock('../../Games/Toohak');

const mockQuestions: Question[] = [{ question: 'Q1', answers: [], timeLimit: 10 }];

describe('Socket Game Handlers', () => {
  let mockIo: Server;
  let mockSocket: Socket;
  let mockEmit: jest.Mock;
  let mockTo: jest.Mock;
  let mockGameInstance: jest.Mocked<Toohak>; // Use Jest's mocked type

  beforeEach(() => {
    mockEmit = jest.fn();
    mockTo = jest.fn(() => ({ emit: mockEmit }));

    mockSocket = {
      id: 'socket456',
      emit: mockEmit,
      to: mockTo,
      // Add other properties or methods if your handlers use them
    } as any;

    mockIo = {
      to: mockTo,
      // Add other properties or methods if your handlers use them
    } as any;

    // Create a fresh mock for Toohak instance for each test
    // This allows us to inspect calls on this specific instance's methods
    mockGameInstance = new Toohak(mockQuestions, 'hostId', jest.fn()) as jest.Mocked<Toohak>;
    
    // Reset mocks
    (getRoom as jest.Mock).mockReset();
    (updateGameState as jest.Mock).mockReset();
    // If Toohak was instantiated inside tests, clear its mocks if needed:
    // (Toohak.prototype.submitAnswer as jest.Mock)?.mockClear();
    // (Toohak.prototype.nextQuestion as jest.Mock)?.mockClear();
    // However, since we are mocking the game instance methods directly, we clear them:
    mockGameInstance.submitAnswer.mockClear();
    mockGameInstance.nextQuestion.mockClear();
    mockGameInstance.startTimer.mockClear(); // if you add tests for this
    mockGameInstance.endRound.mockClear(); // if you add tests for this
  });

  describe('handleSubmitAnswer', () => {
    it('should call game.submitAnswer if room and game exist and game is in "question" state', () => {
      const roomId = 'gameRoom1';
      const answerIndex = 1;
      mockGameInstance.gameState = 'question'; // Game is ready for answers
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleSubmitAnswer(mockIo, mockSocket, { roomId, answerIndex });

      expect(getRoom).toHaveBeenCalledWith(roomId);
      expect(mockGameInstance.submitAnswer).toHaveBeenCalledWith(mockSocket.id, answerIndex);
      // Note: We don't test the emitEvent callback from Toohak here directly,
      // as that's part of Toohak's own tests. We trust that if submitAnswer is called,
      // Toohak will do its job, including calling emitEvent.
    });

    it('should emit an error if the room is not found', () => {
      (getRoom as jest.Mock).mockReturnValue(undefined);
      handleSubmitAnswer(mockIo, mockSocket, { roomId: 'fakeRoom', answerIndex: 0 });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Game not found or not in progress.' });
      expect(mockGameInstance.submitAnswer).not.toHaveBeenCalled();
    });

    it('should emit an error if the game is not in "question" state', () => {
      const roomId = 'gameRoom2';
      mockGameInstance.gameState = 'leaderboard'; // Game is not accepting answers
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleSubmitAnswer(mockIo, mockSocket, { roomId, answerIndex: 0 });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Not the time to answer.' });
      expect(mockGameInstance.submitAnswer).not.toHaveBeenCalled();
    });
  });

  describe('handleNextQuestion', () => {
    it('should call game.nextQuestion if the socket is the host and game is in "leaderboard" state', () => {
      const roomId = 'gameRoom3';
      mockGameInstance.hostId = mockSocket.id; // Current socket is the host
      mockGameInstance.gameState = 'leaderboard'; // Game is ready for next question
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleNextQuestion(mockIo, mockSocket, { roomId });

      expect(getRoom).toHaveBeenCalledWith(roomId);
      expect(mockGameInstance.nextQuestion).toHaveBeenCalled();
      // Similar to submitAnswer, Toohak's emitEvent is trusted to handle actual emissions.
    });

    it('should emit an error if the socket is not the host', () => {
      const roomId = 'gameRoom4';
      mockGameInstance.hostId = 'anotherHostId'; // Current socket is NOT the host
      mockGameInstance.gameState = 'leaderboard';
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleNextQuestion(mockIo, mockSocket, { roomId });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Only the host can advance to the next question.' });
      expect(mockGameInstance.nextQuestion).not.toHaveBeenCalled();
    });

    it('should emit an error if the game is not in "leaderboard" state', () => {
      const roomId = 'gameRoom5';
      mockGameInstance.hostId = mockSocket.id;
      mockGameInstance.gameState = 'question'; // Not the right state
      (getRoom as jest.Mock).mockReturnValue({ id: roomId, game: mockGameInstance, players: [] });

      handleNextQuestion(mockIo, mockSocket, { roomId });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Cannot advance question at this time.' });
      expect(mockGameInstance.nextQuestion).not.toHaveBeenCalled();
    });

    it('should emit an error if the room is not found', () => {
      (getRoom as jest.Mock).mockReturnValue(undefined);
      handleNextQuestion(mockIo, mockSocket, { roomId: 'fakeRoomNext' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Game not found.' });
      expect(mockGameInstance.nextQuestion).not.toHaveBeenCalled();
    });
  });
  
  describe('registerGameHandlers', () => {
    it('should register all game event handlers on the socket', () => {
      mockSocket.on = jest.fn(); // Mock the 'on' method for this test
      registerGameHandlers(mockIo, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('submitAnswer', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('nextQuestion', expect.any(Function));
      
      // Example of how to test if the correct handler is called:
      // Assuming 'submitAnswer' is the first handler registered
      const submitAnswerCallback = (mockSocket.on as jest.Mock).mock.calls.find(call => call[0] === 'submitAnswer')[1];
      
      // Mock getRoom for this specific callback test
      mockGameInstance.gameState = 'question';
      (getRoom as jest.Mock).mockReturnValue({ id: 'testRoom', game: mockGameInstance, players: [] });
      
      submitAnswerCallback({ roomId: 'testRoom', answerIndex: 0 }); // Simulate an event
      expect(mockGameInstance.submitAnswer).toHaveBeenCalledWith(mockSocket.id, 0);
    });
  });
});
