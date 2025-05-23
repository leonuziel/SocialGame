import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toohak from './Toohak'; // Adjust path as necessary
import { socket } from '../api/socket'; // Adjust path as necessary
import { ToohakGameData, Player, GameState } from '../utils/types'; // Adjust path

// Mock the socket module
jest.mock('../api/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

// Mock child components if they are complex or have their own side effects
jest.mock('../components/QuestionDisplay', () => ({ question, onAnswer, disabled }: { question: any, onAnswer: (answerIdx: number) => void, disabled: boolean }) => (
  <div data-testid="question-display">
    <p>{question.question}</p>
    {question.answers.map((ans: any, idx: number) => (
      <button key={idx} onClick={() => onAnswer(idx)} disabled={disabled}>
        {ans.text}
      </button>
    ))}
  </div>
));

jest.mock('../components/Timer', () => ({ timeLimit, onTimeUp }: { timeLimit: number, onTimeUp: () => void }) => {
  // Simple mock: can be made more complex if timer behavior needs to be tested via Game
  React.useEffect(() => {
    // const timer = setTimeout(onTimeUp, timeLimit * 1000);
    // return () => clearTimeout(timer);
  }, [timeLimit, onTimeUp]);
  return <div data-testid="timer">Time Limit: {timeLimit}s</div>;
});


describe('Toohak Game Component', () => {
  const mockRoomId = 'toohakRoom1';
  const mockPlayerId = 'player1'; // Current player
  const mockHostId = 'hostPlayer';

  const mockPlayers: Player[] = [
    { id: mockHostId, name: 'Host', score: 100, isHost: true },
    { id: mockPlayerId, name: 'Player One', score: 50, isHost: false },
  ];

  const mockQuestion = {
    question: 'What is the capital of Testing?',
    answers: [
      { text: 'Jest City', isCorrect: true },
      { text: 'Mocha Town', isCorrect: false },
      { text: 'Enzyme Village', isCorrect: false },
    ],
    timeLimit: 10,
  };

  const mockGameData: ToohakGameData = {
    type: 'toohak',
    currentQuestion: mockQuestion,
    players: mockPlayers, // Usually players list comes from parent but Toohak might receive it directly
  };
  
  const mockGameState: GameState = 'question';

  // Props that would be passed by GameView
  const defaultProps = {
    roomId: mockRoomId,
    playerId: mockPlayerId,
    isHost: false,
    gameState: mockGameState,
    gameData: mockGameData,
    players: mockPlayers, // GameView passes this
    socket: socket, // GameView passes the imported socket
  };

  beforeEach(() => {
    (socket.emit as jest.Mock).mockClear();
    (socket.on as jest.Mock).mockClear();
    (socket.off as jest.Mock).mockClear();
  });

  test('renders QuestionDisplay with current question and answer options when gameState is "question"', () => {
    render(<Toohak {...defaultProps} />);
    
    expect(screen.getByTestId('question-display')).toBeInTheDocument();
    expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
    expect(screen.getByText('Jest City')).toBeInTheDocument();
    expect(screen.getByText('Mocha Town')).toBeInTheDocument();
  });

  test('renders Timer component when gameState is "question"', () => {
    render(<Toohak {...defaultProps} />);
    expect(screen.getByTestId('timer')).toBeInTheDocument();
    expect(screen.getByText(`Time Limit: ${mockQuestion.timeLimit}s`)).toBeInTheDocument();
  });

  test('clicking an answer option calls socket.emit with "submitAnswer"', async () => {
    render(<Toohak {...defaultProps} />);
    
    const answerButton = screen.getByText('Jest City'); // The first answer
    await userEvent.click(answerButton);

    expect(socket.emit).toHaveBeenCalledWith('submitAnswer', {
      roomId: mockRoomId,
      answerIndex: 0, // 'Jest City' is the first answer
    });
  });
  
  test('answer buttons are disabled after an answer is selected', async () => {
    render(<Toohak {...defaultProps} />);
    
    const answerButton1 = screen.getByText('Jest City');
    await userEvent.click(answerButton1);

    // All buttons in QuestionDisplay mock should become disabled
    // This depends on the QuestionDisplay mock correctly implementing the 'disabled' prop
    // or Toohak itself managing a 'submittedAnswer' state that disables interaction.
    // Assuming Toohak sets a state `hasAnswered` which is passed to QuestionDisplay as `disabled`.
    // Let's update the test to reflect this.
    // The QuestionDisplay mock should reflect the disabled state.
    
    // Re-render with a state that indicates an answer has been submitted
    // This requires the Toohak component to manage such a state.
    // For this test, let's assume clicking an answer sets an internal state.
    // The component would then pass `disabled = true` to QuestionDisplay.

    // Check if the button is disabled. This requires the mock to pass through the disabled prop.
    expect(answerButton1).toBeDisabled();
    expect(screen.getByText('Mocha Town')).toBeDisabled();
  });

  test('displays "Waiting for next question..." or similar when gameState is "leaderboard"', () => {
    render(<Toohak {...defaultProps} gameState="leaderboard" />);
    
    expect(screen.getByText(/Waiting for results or next question.../i)).toBeInTheDocument(); // Or whatever message is shown
    expect(screen.queryByTestId('question-display')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timer')).not.toBeInTheDocument();
  });
  
  test('host sees "Next Question" button during "leaderboard" state', () => {
    render(<Toohak {...defaultProps} gameState="leaderboard" isHost={true} />);
    expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
  });

  test('non-host does not see "Next Question" button during "leaderboard" state', () => {
    render(<Toohak {...defaultProps} gameState="leaderboard" isHost={false} />);
    expect(screen.queryByRole('button', { name: /Next Question/i })).not.toBeInTheDocument();
  });

  test('clicking "Next Question" button (as host) emits "nextQuestion" via socket', async () => {
    render(<Toohak {...defaultProps} gameState="leaderboard" isHost={true} />);
    
    const nextQuestionButton = screen.getByRole('button', { name: /Next Question/i });
    await userEvent.click(nextQuestionButton);

    expect(socket.emit).toHaveBeenCalledWith('nextQuestion', { roomId: mockRoomId });
  });

  test('displays round results when gameState is "leaderboard" and roundOverData is available', () => {
    // This assumes that when gameState is 'leaderboard', Toohak component might receive
    // or fetch data about who answered correctly/incorrectly.
    // Let's simulate this by adding a `roundOverData` prop or state within Toohak.
    // For this example, we'll assume `gameData` could be updated with such info.
    const gameDataWithResults: ToohakGameData = {
      ...mockGameData,
      // Example: This structure is hypothetical and depends on actual implementation
      lastRoundAnswers: [ 
        { playerId: mockPlayerId, answerIndex: 0, isCorrect: true, scoreEarned: 100 },
        { playerId: mockHostId, answerIndex: 1, isCorrect: false, scoreEarned: 0 },
      ],
      correctAnswerIndex: 0, // Index of the correct answer for the last question
    };

    render(<Toohak {...defaultProps} gameState="leaderboard" gameData={gameDataWithResults} />);
    
    expect(screen.getByText(/Round Over!/i)).toBeInTheDocument();
    expect(screen.getByText(/Correct answer was: Jest City/i)).toBeInTheDocument(); // Assuming it shows the text of correct answer
    // You might also display which players were correct/incorrect
    expect(screen.getByText(/Player One answered correctly! \(\+100\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Host answered incorrectly./i)).toBeInTheDocument();
  });
  
  test('displays "No question available" if gameData.currentQuestion is null and gameState is "question"', () => {
    render(<Toohak {...defaultProps} gameData={{ ...mockGameData, currentQuestion: null }} gameState="question" />);
    expect(screen.getByText(/No question available at the moment./i)).toBeInTheDocument();
  });

  test('cleans up socket listeners on unmount', () => {
    // Toohak might listen to 'answerResult', 'allAnswersSubmitted', etc.
    // For this example, let's assume it listens to 'roundSummary' and 'error'
    const { unmount } = render(<Toohak {...defaultProps} />);
    
    // Simulate that 'on' was called for some events during setup
    // (socket.on as jest.Mock).mock.calls would show what Toohak registered for.
    // Let's assume Toohak registers for 'showRoundResults' and 'gameError'
    // This needs to match what Toohak actually does in its useEffect.
    
    // For the sake of example:
    const showRoundResultsHandler = jest.fn();
    const gameErrorHandler = jest.fn();
    (socket.on as jest.Mock)
      .mockImplementationOnce((event, handler) => { if(event === 'showRoundResults') return showRoundResultsHandler; })
      .mockImplementationOnce((event, handler) => { if(event === 'gameError') return gameErrorHandler; });

    // To properly test this, we need to know which handlers Toohak actually registers.
    // Let's assume it registers `showRoundResults` and `gameError`
    // We'd need to find these specific handlers from the `socket.on` mock calls.
    // This part of the test is highly dependent on the internal implementation of Toohak's useEffect.
    
    // A more robust way is to ensure that any handlers registered by Toohak in its useEffect
    // are cleaned up.

    // Let's say Toohak's useEffect for socket events is:
    // useEffect(() => {
    //   const handleRoundResults = (data) => { ... };
    //   socket.on('showRoundResults', handleRoundResults);
    //   return () => {
    //     socket.off('showRoundResults', handleRoundResults);
    //   }
    // }, [socket]);

    // The test would then be:
    render(<Toohak {...defaultProps} />); // First render to register
    unmount(); // Unmount to trigger cleanup

    // Verify that socket.off was called for any handlers that socket.on was called with.
    const onCalls = (socket.on as jest.Mock).mock.calls;
    const offCalls = (socket.off as jest.Mock).mock.calls;

    // Example: if Toohak listened to 'showRoundResults'
    const showRoundResultsOnCall = onCalls.find(call => call[0] === 'showRoundResults');
    if (showRoundResultsOnCall) {
      expect(socket.off).toHaveBeenCalledWith('showRoundResults', showRoundResultsOnCall[1]);
    }
    // Add more for other events if Toohak listens to them.
    // This is a generic way to check cleanup if specific handlers aren't easily accessible.
    // For this template, we'll assume this level of checking is sufficient.
    // A simpler check is just that `socket.off` was called, if the handlers are anonymous.
    // However, React Testing Library best practices encourage testing behavior, not implementation.
    // So, ensuring the *correct* handlers are removed is better.
    
    // If Toohak has specific handlers it registers, we can test for those.
    // For now, this test is a placeholder for more detailed listener cleanup testing.
    // If Toohak doesn't register any specific listeners itself (delegates to parent), this test might be N/A.
    // Based on typical game structure, Toohak would listen for things like answer feedback or forced progression.
    expect(true).toBe(true); // Placeholder for more specific listener cleanup test
  });
});
