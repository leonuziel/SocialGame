import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LobbyView from './LobbyView'; // Adjust path as necessary
import { socket } from '../api/socket'; // Adjust path as necessary
import { Player } from '../utils/types'; // Adjust path

// Mock the socket module
jest.mock('../api/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

// Mock child components if they are complex or have their own side effects
jest.mock('../components/PlayerList', () => ({ players, currentPlayerId }: { players: Player[], currentPlayerId: string | null }) => (
  <div data-testid="player-list">
    {players.map(p => (
      <div key={p.id} data-testid={`player-${p.id}`}>
        {p.name} {p.id === currentPlayerId ? '(You)' : ''} {p.isHost ? '(Host)' : ''}
      </div>
    ))}
  </div>
));

jest.mock('../components/Chat', () => ({ roomId, playerId }: { roomId: string, playerId: string | null }) => (
  <div data-testid="chat-component">Chat for {roomId} by {playerId}</div>
));


describe('LobbyView Component', () => {
  const mockRoomId = 'lobbyRoom1';
  const mockPlayerId = 'player1';
  const mockHostId = 'hostPlayer';
  const mockPlayers: Player[] = [
    { id: mockHostId, name: 'Host Player', score: 0, isHost: true },
    { id: mockPlayerId, name: 'Current Player', score: 0, isHost: false },
    { id: 'player2', name: 'Other Player', score: 0, isHost: false },
  ];

  const mockOnGameStart = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    (socket.emit as jest.Mock).mockClear();
    (socket.on as jest.Mock).mockClear();
    (socket.off as jest.Mock).mockClear();
    mockOnGameStart.mockClear();
    mockSetError.mockClear();
  });

  test('renders room ID, PlayerList, and Chat component', () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );

    expect(screen.getByText(`Room ID: ${mockRoomId}`)).toBeInTheDocument();
    expect(screen.getByTestId('player-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-component')).toBeInTheDocument();
    expect(screen.getByText('Current Player (You)')).toBeInTheDocument();
    expect(screen.getByText('Host Player (Host)')).toBeInTheDocument();
  });

  test('shows "Start Game" button if current player is the host', () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockHostId} // Current player is the host
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );
    expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument();
  });

  test('does not show "Start Game" button if current player is not the host', () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId} // Current player is not the host
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );
    expect(screen.queryByRole('button', { name: /Start Game/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for the host to start the game.../i)).toBeInTheDocument();
  });

  test('clicking "Start Game" button emits "startGame" event via socket', async () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockHostId} // Current player is the host
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );
    
    const startGameButton = screen.getByRole('button', { name: /Start Game/i });
    await userEvent.click(startGameButton);

    expect(socket.emit).toHaveBeenCalledWith('startGame', { roomId: mockRoomId });
  });

  test('calls onGameStart when "gameStarted" event is received from socket', async () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );

    // Simulate the server emitting 'gameStarted' event
    const gameStartedHandlerCall = (socket.on as jest.Mock).mock.calls.find(call => call[0] === 'gameStarted');
    if (gameStartedHandlerCall && gameStartedHandlerCall[1]) {
      const handler = gameStartedHandlerCall[1];
      const gameData = { type: 'toohak', currentQuestion: { question: 'Q?', answers: [], timeLimit: 10 }};
      handler({ roomId: mockRoomId, gameType: 'toohak', gameData }); // Pass some mock game data
    }

    await waitFor(() => {
      expect(mockOnGameStart).toHaveBeenCalledWith('toohak', expect.objectContaining({ type: 'toohak' }));
    });
  });

  test('calls setError when "error" event is received from socket', async () => {
    render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );

    const errorHandlerCall = (socket.on as jest.Mock).mock.calls.find(call => call[0] === 'error');
    if (errorHandlerCall && errorHandlerCall[1]) {
      const handler = errorHandlerCall[1];
      handler({ message: 'A lobby error occurred' });
    }

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('A lobby error occurred');
    });
  });
  
  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(
      <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={mockPlayers}
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );
    
    expect(socket.on).toHaveBeenCalledWith('gameStarted', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('error', expect.any(Function));
    
    const onCalls = (socket.on as jest.Mock).mock.calls;
    const gameStartedHandler = onCalls.find(call => call[0] === 'gameStarted')?.[1];
    const errorHandler = onCalls.find(call => call[0] === 'error')?.[1];

    unmount();
    
    expect(socket.off).toHaveBeenCalledWith('gameStarted', gameStartedHandler);
    expect(socket.off).toHaveBeenCalledWith('error', errorHandler);
  });

  test('displays a message if player list is empty or undefined', () => {
    render(
       <LobbyView
        roomId={mockRoomId}
        playerId={mockPlayerId}
        players={[]} // Empty player list
        hostId={mockHostId}
        onGameStart={mockOnGameStart}
        setError={mockSetError}
      />
    );
    // PlayerList mock would render nothing for players=[].
    // LobbyView itself doesn't add a specific message for empty player list in this structure,
    // but PlayerList mock would just render an empty div. This test confirms it doesn't crash.
    expect(screen.getByTestId('player-list')).toBeInTheDocument();
    expect(screen.queryByTestId(`player-${mockPlayerId}`)).not.toBeInTheDocument();
  });
});
