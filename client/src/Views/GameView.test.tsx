import React from 'react';
import { render, screen } from '@testing-library/react';
import GameView from './GameView'; // Adjust path as necessary
import { Player, GameState, ToohakGameData, TriviaGameData } from '../utils/types'; // Adjust path
import { socket } from '../api/socket'; // Adjust path

// Mock the socket module (even if not directly used by GameView, child components might)
jest.mock('../api/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

// Mock child game components
jest.mock('../Games/Toohak', () => () => <div data-testid="toohak-game">Toohak Game Component</div>);
jest.mock('../Games/Trivia', () => () => <div data-testid="trivia-game">Trivia Game Component</div>);
// Mock ScoreDisplay if it's complex or has its own socket interactions
jest.mock('../components/ScoreDisplay', () => ({ players }: { players: Player[] }) => (
  <div data-testid="score-display">
    Scores: {players.map(p => `${p.name}: ${p.score}`).join(', ')}
  </div>
));


describe('GameView Component', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'Player 1', score: 100, isHost: true },
    { id: 'p2', name: 'Player 2', score: 50, isHost: false },
  ];

  const mockRoomId = 'room123';
  const mockPlayerId = 'p1';

  const toohakGameData: ToohakGameData = {
    type: 'toohak',
    currentQuestion: {
      question: 'What is 2+2?',
      answers: [{text: '3', isCorrect: false}, {text: '4', isCorrect: true}],
      timeLimit: 10,
    },
    players: mockPlayers,
    // ... any other Toohak specific data
  };

  const triviaGameData: TriviaGameData = {
    type: 'trivia',
    currentQuestion: {
      question: 'Capital of France?',
      answers: [{text: 'Paris', isCorrect: true}, {text: 'London', isCorrect: false}],
      timeLimit: 20,
      category: 'Geography',
      difficulty: 'easy',
    },
    players: mockPlayers,
    // ... any other Trivia specific data
  };
  
  const mockGameState: GameState = 'question'; // Example state

  beforeEach(() => {
    (socket.emit as jest.Mock).mockClear();
  });

  test('renders ScoreDisplay with current players', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState={mockGameState}
        gameData={toohakGameData}
        gameType="toohak"
      />
    );
    expect(screen.getByTestId('score-display')).toBeInTheDocument();
    expect(screen.getByText(/Scores: Player 1: 100, Player 2: 50/i)).toBeInTheDocument();
  });

  test('renders Toohak game component when gameType is "toohak"', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState={mockGameState}
        gameData={toohakGameData}
        gameType="toohak"
      />
    );
    expect(screen.getByTestId('toohak-game')).toBeInTheDocument();
    expect(screen.queryByTestId('trivia-game')).not.toBeInTheDocument();
  });

  test('renders Trivia game component when gameType is "trivia"', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState={mockGameState}
        gameData={triviaGameData}
        gameType="trivia"
      />
    );
    expect(screen.getByTestId('trivia-game')).toBeInTheDocument();
    expect(screen.queryByTestId('toohak-game')).not.toBeInTheDocument();
  });

  test('renders "Waiting for game to start..." when gameState is "waiting"', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState="waiting"
        gameData={null} // gameData might be null in 'waiting'
        gameType="toohak" // gameType could be set
      />
    );
    expect(screen.getByText(/Waiting for game to start.../i)).toBeInTheDocument();
  });

  test('renders "Game Over!" when gameState is "ended"', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState="ended"
        gameData={null} // gameData might be null or contain final scores
        gameType="toohak"
      />
    );
    expect(screen.getByText(/Game Over!/i)).toBeInTheDocument();
    // Optionally, check for final scores if they are displayed differently here
  });
  
  test('renders "Leaderboard" heading when gameState is "leaderboard"', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState="leaderboard"
        gameData={toohakGameData} // gameData would be relevant here
        gameType="toohak"
      />
    );
    expect(screen.getByRole('heading', { name: /Leaderboard/i })).toBeInTheDocument();
    // ScoreDisplay is already tested for showing scores. If leaderboard has more, test that.
  });

  test('passes correct props to Toohak component', () => {
    // To test props passed to children, the mock needs to capture them.
    // Modify the mock for Toohak:
    const mockToohak = jest.fn(() => <div data-testid="toohak-game-props-test">Toohak</div>);
    jest.mock('../Games/Toohak', () => (props: any) => mockToohak(props));

    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState={mockGameState}
        gameData={toohakGameData}
        gameType="toohak"
      />
    );
    expect(mockToohak).toHaveBeenCalledWith({
      roomId: mockRoomId,
      playerId: mockPlayerId,
      isHost: true, // Since mockPlayerId p1 is host
      gameState: mockGameState,
      gameData: toohakGameData,
      players: mockPlayers, // GameView also passes players directly
      socket: socket, // GameView passes the imported socket
    });
    jest.unmock('../Games/Toohak'); // Clean up mock for other tests
    jest.mock('../Games/Toohak', () => () => <div data-testid="toohak-game">Toohak Game Component</div>); // Restore simple mock
  });

  test('passes correct props to Trivia component', () => {
    const mockTrivia = jest.fn(() => <div data-testid="trivia-game-props-test">Trivia</div>);
    jest.mock('../Games/Trivia', () => (props: any) => mockTrivia(props));

    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId} // p1 is host
        players={mockPlayers}
        gameState={mockGameState}
        gameData={triviaGameData}
        gameType="trivia"
      />
    );
    expect(mockTrivia).toHaveBeenCalledWith({
      roomId: mockRoomId,
      playerId: mockPlayerId,
      isHost: true,
      gameState: mockGameState,
      gameData: triviaGameData,
      players: mockPlayers,
      socket: socket,
    });
    jest.unmock('../Games/Trivia');
    jest.mock('../Games/Trivia', () => () => <div data-testid="trivia-game">Trivia Game Component</div>);
  });
  
  test('displays nothing if gameType is unknown and gameState is active', () => {
    render(
      <GameView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        gameState={mockGameState} // e.g. 'question'
        gameData={null}
        gameType={'unknownGame' as any} // Force an unknown game type
      />
    );
    expect(screen.queryByTestId('toohak-game')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trivia-game')).not.toBeInTheDocument();
    // It will still render ScoreDisplay. The main game area might be empty or show a message.
    // Based on current GameView structure, it would render nothing for the game area.
    // If specific "unknown game" message is desired, test for that.
    // For now, we confirm no known game components are rendered.
  });
});
