import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinRoom from './JoinRoom'; // Adjust path as necessary
import { socket } from '../api/socket'; // Adjust path as necessary

// Mock the socket module
jest.mock('../api/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('JoinRoom Component', () => {
  const mockSetError = jest.fn();
  const mockOnRoomJoined = jest.fn();

  beforeEach(() => {
    // Clear mock calls before each test
    (socket.emit as jest.Mock).mockClear();
    (socket.on as jest.Mock).mockClear();
    (socket.off as jest.Mock).mockClear();
    mockSetError.mockClear();
    mockOnRoomJoined.mockClear();
  });

  test('renders input fields for room ID and name, and a join button', () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    
    expect(screen.getByLabelText(/Room ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Room/i })).toBeInTheDocument();
  });

  test('join button is initially disabled', () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    expect(screen.getByRole('button', { name: /Join Room/i })).toBeDisabled();
  });

  test('join button becomes enabled when both fields are filled', async () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    
    const roomIdInput = screen.getByLabelText(/Room ID/i);
    const nameInput = screen.getByLabelText(/Your Name/i);
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    await userEvent.type(roomIdInput, 'testRoom');
    expect(joinButton).toBeDisabled(); // Still disabled as name is missing

    await userEvent.type(nameInput, 'Test User');
    expect(joinButton).toBeEnabled(); // Enabled after both are filled
  });

  test('submitting the form calls socket.emit with room ID and name, and calls onRoomJoined on success', async () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    
    const roomIdInput = screen.getByLabelText(/Room ID/i);
    const nameInput = screen.getByLabelText(/Your Name/i);
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    await userEvent.type(roomIdInput, 'room123');
    await userEvent.type(nameInput, 'Player One');
    await userEvent.click(joinButton);

    expect(socket.emit).toHaveBeenCalledWith('joinRoom', { roomId: 'room123', name: 'Player One' });

    // Simulate the server emitting 'roomJoined' event
    // Find the registered 'roomJoined' handler and call it
    const roomJoinedHandlerCall = (socket.on as jest.Mock).mock.calls.find(call => call[0] === 'roomJoined');
    if (roomJoinedHandlerCall && roomJoinedHandlerCall[1]) {
      const handler = roomJoinedHandlerCall[1];
      handler({ roomId: 'room123', playerId: 'playerSocketId', name: 'Player One', gameState: 'waiting' });
    }
    
    await waitFor(() => {
      expect(mockOnRoomJoined).toHaveBeenCalledWith({ roomId: 'room123', playerId: 'playerSocketId', name: 'Player One', gameState: 'waiting' });
    });
  });

  test('displays an error message if the error prop is provided', () => {
    const errorMessage = 'Failed to join room. Room not found.';
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // Check if setError is NOT called when error prop is already set (depends on component logic)
    // For this component, it likely just displays the passed error.
  });

  test('calls setError when server emits an error event', async () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
        
    // Simulate the server emitting an 'error' event
    const errorHandlerCall = (socket.on as jest.Mock).mock.calls.find(call => call[0] === 'error');
    if (errorHandlerCall && errorHandlerCall[1]) {
      const handler = errorHandlerCall[1];
      handler({ message: 'Server error occurred' });
    }

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Server error occurred');
    });
  });

  test('input fields update their values on user input', async () => {
    render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    
    const roomIdInput = screen.getByLabelText(/Room ID/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/Your Name/i) as HTMLInputElement;

    await userEvent.type(roomIdInput, 'testRoom1');
    expect(roomIdInput.value).toBe('testRoom1');

    await userEvent.type(nameInput, 'My Name');
    expect(nameInput.value).toBe('My Name');
  });
  
  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<JoinRoom setError={mockSetError} onRoomJoined={mockOnRoomJoined} error={null} />);
    
    // Check that 'on' was called for 'roomJoined' and 'error'
    expect(socket.on).toHaveBeenCalledWith('roomJoined', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('error', expect.any(Function));
    
    unmount();
    
    // Check that 'off' was called for 'roomJoined' and 'error' with the correct handlers
    // This requires capturing the handler functions passed to 'on'.
    const onCalls = (socket.on as jest.Mock).mock.calls;
    const roomJoinedHandler = onCalls.find(call => call[0] === 'roomJoined')?.[1];
    const errorHandler = onCalls.find(call => call[0] === 'error')?.[1];

    expect(socket.off).toHaveBeenCalledWith('roomJoined', roomJoinedHandler);
    expect(socket.off).toHaveBeenCalledWith('error', errorHandler);
  });
});
