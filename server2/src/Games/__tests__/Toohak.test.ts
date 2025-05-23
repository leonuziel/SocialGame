import { Toohak, Player } from '../Toohak'; // Adjust path as necessary
import { Question } from '../../utils/types'; // Adjust path as necessary

// Mock questions for testing
const mockQuestions: Question[] = [
  {
    question: 'What is 2 + 2?',
    answers: [{ text: '3', isCorrect: false }, { text: '4', isCorrect: true }],
    timeLimit: 10,
  },
  {
    question: 'What is the capital of France?',
    answers: [{ text: 'Paris', isCorrect: true }, { text: 'London', isCorrect: false }],
    timeLimit: 10,
  },
];

describe('Toohak Game Logic', () => {
  let game: Toohak;
  const hostId = 'host123';

  beforeEach(() => {
    // Initialize a new game before each test
    game = new Toohak(mockQuestions, hostId, (event, data) => {
      // Mock emitEvent function, can be spied on if needed
      // console.log(`Event: ${event}`, data);
    });
  });

  test('Game creation and initialization', () => {
    expect(game).toBeInstanceOf(Toohak);
    expect(game.currentQuestionIndex).toBe(0);
    expect(game.gameState).toBe('waiting');
    expect(game.players.length).toBe(0); // Host is not added as a player by default in this setup
    expect(game.hostId).toBe(hostId);
  });

  test('Adding players', () => {
    const player1Id = 'player1';
    const player1Name = 'Alice';
    game.addPlayer(player1Id, player1Name);
    expect(game.players.length).toBe(1);
    expect(game.players[0].id).toBe(player1Id);
    expect(game.players[0].name).toBe(player1Name);
    expect(game.players[0].score).toBe(0);

    // Test adding another player
    const player2Id = 'player2';
    const player2Name = 'Bob';
    game.addPlayer(player2Id, player2Name);
    expect(game.players.length).toBe(2);

    // Test adding a player with an existing ID (should not add)
    game.addPlayer(player1Id, 'Charlie');
    expect(game.players.length).toBe(2);
  });

  test('Starting the game', () => {
    game.startGame();
    expect(game.gameState).toBe('question');
    // Potentially check if the first question is presented, if emitEvent is spied upon
  });

  test('Submitting a correct answer', () => {
    const playerId = 'player1';
    game.addPlayer(playerId, 'Alice');
    game.startGame(); // Game state becomes 'question'

    // Assume the first question's correct answer is the second option (index 1)
    game.submitAnswer(playerId, 1); 
    const player = game.players.find(p => p.id === playerId);
    expect(player?.score).toBeGreaterThan(0); // Score should increase
    expect(game.gameState).toBe('leaderboard'); // Game state should change after answer
  });

  test('Submitting an incorrect answer', () => {
    const playerId = 'player1';
    game.addPlayer(playerId, 'Alice');
    game.startGame();

    // Assume the first question's incorrect answer is the first option (index 0)
    game.submitAnswer(playerId, 0);
    const player = game.players.find(p => p.id === playerId);
    expect(player?.score).toBe(0); // Score should not change
    expect(game.gameState).toBe('leaderboard');
  });

  test('Score calculation depends on time (mocking or detailed setup needed)', () => {
    // This test is more complex as score depends on time.
    // For a simple test:
    const player1Id = 'player1';
    game.addPlayer(player1Id, 'Alice');
    game.startGame();
    game.submitAnswer(player1Id, 1); // Correct answer for Q1
    const player1 = game.players.find(p => p.id === player1Id);
    expect(player1?.score).toBeGreaterThan(0);

    // To properly test time-based scoring, you might need to:
    // 1. Mock Date.now() or the timer mechanism within Toohak if it uses one.
    // 2. Call submitAnswer at different "times" and verify scores.
    // For now, this is a basic check.
  });

  test('Moving to the next question', () => {
    game.startGame();
    expect(game.currentQuestionIndex).toBe(0);
    game.nextQuestion(); // Moves from question 0 to leaderboard, then to question 1
    expect(game.currentQuestionIndex).toBe(1);
    expect(game.gameState).toBe('question');
  });

  test('Game end conditions', () => {
    game.startGame();
    // Go through all questions
    mockQuestions.forEach((_, index) => {
      game.submitAnswer(hostId, 0); // Host submits a dummy answer to move state
      if (index < mockQuestions.length -1) {
        game.nextQuestion();
      }
    });
    // After the last question's leaderboard, game should end
    game.nextQuestion(); // This call should attempt to move past the last question
    expect(game.gameState).toBe('ended');
    expect(game.currentQuestionIndex).toBe(mockQuestions.length -1); // Stays on last question index
  });

  test('Player not found when submitting answer', () => {
    game.startGame();
    game.submitAnswer('nonExistentPlayer', 1);
    // No player score should change, no error thrown, handled gracefully
    // Potentially check emitEvent for an error message if that's the design
    expect(game.gameState).toBe('question'); // State shouldn't change if no valid player answers
  });

  test('Submitting answer when game is not in "question" state', () => {
    const playerId = 'player1';
    game.addPlayer(playerId, 'Alice');
    // Game is in 'waiting' state
    game.submitAnswer(playerId, 1);
    const player = game.players.find(p => p.id === playerId);
    expect(player?.score).toBe(0); // Score should not change

    game.startGame(); // -> question
    game.submitAnswer(playerId, 1); // -> leaderboard
    expect(game.gameState).toBe('leaderboard');
    const scoreAfterFirstAnswer = player?.score;
    game.submitAnswer(playerId, 0); // Try submitting again while on leaderboard
    expect(player?.score).toBe(scoreAfterFirstAnswer); // Score should not change
  });

   test('Handling no questions provided', () => {
    const gameWithNoQuestions = new Toohak([], hostId, () => {});
    gameWithNoQuestions.startGame();
    expect(gameWithNoQuestions.gameState).toBe('ended'); // Or some other appropriate state
  });

  test('Player already submitted an answer for the current question', () => {
    const playerId = 'player1';
    game.addPlayer(playerId, 'Alice');
    game.startGame();
    
    game.submitAnswer(playerId, 1); // First submission
    const scoreAfterFirstSubmission = game.players.find(p => p.id === playerId)?.score;
    
    game.submitAnswer(playerId, 0); // Second submission for the same question
    const scoreAfterSecondSubmission = game.players.find(p => p.id === playerId)?.score;

    expect(scoreAfterSecondSubmission).toBe(scoreAfterFirstSubmission);
    // Optionally, check if an event is emitted to inform the player or host.
  });
});
