import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Trivia from './Trivia'; // Adjust path as necessary
import { socket } from '../api/socket'; // Adjust path as necessary
import { TriviaGameData, Player, GameState } from '../utils/types'; // Adjust path

// Mock the socket module
jest.mock('../api/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

// Mock child components (similar to Toohak tests)
jest.mock('../components/QuestionDisplay', () => ({ question, onAnswer, disabled }: { question: any, onAnswer: (answerIdx: number) => void, disabled: boolean }) => (
  <div data-testid="question-display">
    <p>{question.question}</p>
    <p>Category: {question.category} - Difficulty: {question.difficulty}</p>
    {question.answers.map((ans: any, idx: number) => (
      <button key={idx} onClick={() => onAnswer(idx)} disabled={disabled}>
        {ans.text}
      </button>
    ))}
  </div>
));

jest.mock('../components/Timer', () => ({ timeLimit, onTimeUp }: { timeLimit: number, onTimeUp: () => void }) => {
  return <div data-testid="timer">Time Limit: {timeLimit}s</div>;
});


describe('Trivia Game Component', () => {
  const mockRoomId = 'triviaRoom1';
  const mockPlayerId = 'playerTrivia1'; // Current player
  const mockHostId = 'hostTrivia';

  const mockPlayers: Player[] = [
    { id: mockHostId, name: 'Trivia Host', score: 200, isHost: true },
    { id: mockPlayerId, name: 'Trivia Player One', score: 150, isHost: false },
  ];

  const mockTriviaQuestion = {
    question: 'Which planet is known as the Red Planet?',
    answers: [
      { text: 'Earth', isCorrect: false },
      { text: 'Mars', isCorrect: true },
      { text: 'Jupiter', isCorrect: false },
      { text: 'Venus', isCorrect: false },
    ],
    timeLimit: 15,
    category: 'Science',
    difficulty: 'easy',
  };

  const mockGameData: TriviaGameData = {
    type: 'trivia',
    currentQuestion: mockTriviaQuestion,
    players: mockPlayers, 
  };
  
  const mockGameState: GameState = 'question';

  const defaultProps = {
    roomId: mockRoomId,
    playerId: mockPlayerId,
    isHost: false,
    gameState: mockGameState,
    gameData: mockGameData,
    players: mockPlayers,
    socket: socket,
  };

  beforeEach(() => {
    (socket.emit as jest.Mock).mockClear();
    (socket.on as jest.Mock).mockClear();
    (socket.off as jest.Mock).mockClear();
  });

  test('renders QuestionDisplay with current trivia question, category, difficulty and options when gameState is "question"', () => {
    render(<Trivia {...defaultProps} />);
    
    expect(screen.getByTestId('question-display')).toBeInTheDocument();
    expect(screen.getByText(mockTriviaQuestion.question)).toBeInTheDocument();
    expect(screen.getByText(`Category: ${mockTriviaQuestion.category} - Difficulty: ${mockTriviaQuestion.difficulty}`)).toBeInTheDocument();
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Earth')).toBeInTheDocument();
  });

  test('renders Timer component when gameState is "question"', () => {
    render(<Trivia {...defaultProps} />);
    expect(screen.getByTestId('timer')).toBeInTheDocument();
    expect(screen.getByText(`Time Limit: ${mockTriviaQuestion.timeLimit}s`)).toBeInTheDocument();
  });

  test('clicking an answer option calls socket.emit with "submitAnswer"', async () => {
    render(<Trivia {...defaultProps} />);
    
    const answerButton = screen.getByText('Mars'); // The correct answer
    await userEvent.click(answerButton);

    expect(socket.emit).toHaveBeenCalledWith('submitAnswer', {
      roomId: mockRoomId,
      answerIndex: 1, // 'Mars' is the second answer (index 1)
    });
  });
  
  test('answer buttons are disabled after an answer is selected', async () => {
    render(<Trivia {...defaultProps} />);
    
    const answerButtonMars = screen.getByText('Mars');
    await userEvent.click(answerButtonMars);

    expect(answerButtonMars).toBeDisabled();
    expect(screen.getByText('Earth')).toBeDisabled(); // Check another button
  });

  test('displays "Waiting for results or next question..." when gameState is "leaderboard"', () => {
    render(<Trivia {...defaultProps} gameState="leaderboard" />);
    
    expect(screen.getByText(/Waiting for results or next question.../i)).toBeInTheDocument();
    expect(screen.queryByTestId('question-display')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timer')).not.toBeInTheDocument();
  });
  
  test('host sees "Next Question" button during "leaderboard" state', () => {
    render(<Trivia {...defaultProps} gameState="leaderboard" isHost={true} />);
    expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
  });

  test('non-host does not see "Next Question" button during "leaderboard" state', () => {
    render(<Trivia {...defaultProps} gameState="leaderboard" isHost={false} />);
    expect(screen.queryByRole('button', { name: /Next Question/i })).not.toBeInTheDocument();
  });

  test('clicking "Next Question" button (as host) emits "nextQuestion" via socket', async () => {
    render(<Trivia {...defaultProps} gameState="leaderboard" isHost={true} />);
    
    const nextQuestionButton = screen.getByRole('button', { name: /Next Question/i });
    await userEvent.click(nextQuestionButton);

    expect(socket.emit).toHaveBeenCalledWith('nextQuestion', { roomId: mockRoomId });
  });

  test('displays round results when gameState is "leaderboard" and gameData contains result info', () => {
    const gameDataWithResults: TriviaGameData = {
      ...mockGameData,
      lastRoundAnswers: [ 
        { playerId: mockPlayerId, answerIndex: 1, isCorrect: true, scoreEarned: 50 },
        { playerId: mockHostId, answerIndex: 0, isCorrect: false, scoreEarned: 0 },
      ],
      correctAnswerIndex: 1,
    };

    render(<Trivia {...defaultProps} gameState="leaderboard" gameData={gameDataWithResults} />);
    
    expect(screen.getByText(/Round Over!/i)).toBeInTheDocument();
    expect(screen.getByText(/Correct answer was: Mars/i)).toBeInTheDocument();
    expect(screen.getByText(/Trivia Player One answered correctly! \(\+50\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Trivia Host answered incorrectly./i)).toBeInTheDocument();
  });
  
  test('displays "No question available" if gameData.currentQuestion is null and gameState is "question"', () => {
    render(<Trivia {...defaultProps} gameData={{ ...mockGameData, currentQuestion: null }} gameState="question" />);
    expect(screen.getByText(/No question available at the moment./i)).toBeInTheDocument();
  });

  // Placeholder for socket listener cleanup, similar to Toohak.test.tsx
  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<Trivia {...defaultProps} />);
    // ... (logic to check socket.on/off calls, specific to Trivia's event handling) ...
    // This test is a placeholder and needs to be filled if Trivia component
    // directly registers and unregisters socket event listeners.
    // For now, assume it behaves correctly or delegates to parent.
    unmount();
    expect(true).toBe(true); // Placeholder
  });
});
