import {
  createRoom,
  getRoom,
  removeRoom,
  addPlayerToRoom,
  getPlayer,
  removePlayerFromRoom,
  getAllPlayersInRoom,
  updateGameState,
  getGameState,
} from '../store'; // Adjust path as necessary
import { Toohak } from '../../Games/Toohak'; // Adjust path
import { Question } from '../../utils/types'; // Adjust path

// Mock the Toohak game class
jest.mock('../../Games/Toohak');

const mockQuestions: Question[] = [{ question: 'Q1', answers: [], timeLimit: 10 }];

describe('Data Store Logic', () => {
  const MOCK_ROOM_ID = 'testRoom123';
  const MOCK_PLAYER_ID = 'playerABC';
  const MOCK_PLAYER_NAME = 'Test Player';

  beforeEach(() => {
    // Clear rooms before each test to ensure a clean state
    // This assumes your store might hold state in memory or you have a reset mechanism.
    // If store directly interacts with a DB, this might need actual DB cleanup or specific mock resets.
    const room = getRoom(MOCK_ROOM_ID);
    if (room) {
      removeRoom(MOCK_ROOM_ID);
    }
    // Ensure player is also cleared if they exist outside a room or if not cleared by removeRoom
    const player = getPlayer(MOCK_PLAYER_ID);
    if (player) {
        // Assuming removePlayerFromRoom can also be used to clean up a player if they are in any room
        // Or if you have a direct way to remove a player: removePlayer(MOCK_PLAYER_ID)
        // For now, we'll rely on room removal to also clear players associated with that room for these tests
    }
  });

  test('Room creation, retrieval, and deletion', () => {
    // Create a room
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    const createdRoom = createRoom(MOCK_ROOM_ID, newGame);
    expect(createdRoom).toBeDefined();
    expect(createdRoom.id).toBe(MOCK_ROOM_ID);
    expect(createdRoom.game).toBe(newGame);
    expect(createdRoom.players).toEqual([]); // No players yet

    // Retrieve the room
    const retrievedRoom = getRoom(MOCK_ROOM_ID);
    expect(retrievedRoom).toBeDefined();
    expect(retrievedRoom?.id).toBe(MOCK_ROOM_ID);

    // Delete the room
    const deletionResult = removeRoom(MOCK_ROOM_ID);
    expect(deletionResult).toBe(true);
    const nonExistentRoom = getRoom(MOCK_ROOM_ID);
    expect(nonExistentRoom).toBeUndefined();

    // Test deleting a non-existent room
    const nonExistentDeletionResult = removeRoom('nonExistentRoom');
    expect(nonExistentDeletionResult).toBe(false);
  });

  test('Adding player to a room', () => {
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    createRoom(MOCK_ROOM_ID, newGame);

    const player = addPlayerToRoom(MOCK_ROOM_ID, MOCK_PLAYER_ID, MOCK_PLAYER_NAME);
    expect(player).toBeDefined();
    expect(player?.id).toBe(MOCK_PLAYER_ID);
    expect(player?.name).toBe(MOCK_PLAYER_NAME);
    expect(player?.roomId).toBe(MOCK_ROOM_ID);

    const room = getRoom(MOCK_ROOM_ID);
    expect(room?.players.length).toBe(1);
    expect(room?.players[0].id).toBe(MOCK_PLAYER_ID);

    // Test adding player to a non-existent room
    const playerInNonExistentRoom = addPlayerToRoom('fakeRoom', 'player2', 'Ghost');
    expect(playerInNonExistentRoom).toBeUndefined();
  });

  test('Retrieving a player', () => {
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    createRoom(MOCK_ROOM_ID, newGame);
    addPlayerToRoom(MOCK_ROOM_ID, MOCK_PLAYER_ID, MOCK_PLAYER_NAME);

    const retrievedPlayer = getPlayer(MOCK_PLAYER_ID);
    expect(retrievedPlayer).toBeDefined();
    expect(retrievedPlayer?.id).toBe(MOCK_PLAYER_ID);
    expect(retrievedPlayer?.name).toBe(MOCK_PLAYER_NAME);

    // Test retrieving a non-existent player
    const nonExistentPlayer = getPlayer('nonExistentPlayer');
    expect(nonExistentPlayer).toBeUndefined();
  });

  test('Removing player from a room', () => {
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    createRoom(MOCK_ROOM_ID, newGame);
    addPlayerToRoom(MOCK_ROOM_ID, MOCK_PLAYER_ID, MOCK_PLAYER_NAME);

    const removalResult = removePlayerFromRoom(MOCK_PLAYER_ID);
    expect(removalResult).toBe(true);

    const room = getRoom(MOCK_ROOM_ID);
    expect(room?.players.length).toBe(0);
    const player = getPlayer(MOCK_PLAYER_ID);
    expect(player).toBeUndefined(); // Player should also be removed from global player list

    // Test removing a non-existent player
    const nonExistentRemoval = removePlayerFromRoom('nonExistentPlayer');
    expect(nonExistentRemoval).toBe(false);
  });

  test('Getting all players in a room', () => {
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    createRoom(MOCK_ROOM_ID, newGame);
    addPlayerToRoom(MOCK_ROOM_ID, 'p1', 'Player One');
    addPlayerToRoom(MOCK_ROOM_ID, 'p2', 'Player Two');

    const playersInRoom = getAllPlayersInRoom(MOCK_ROOM_ID);
    expect(playersInRoom.length).toBe(2);
    expect(playersInRoom.find(p => p.id === 'p1')).toBeDefined();
    expect(playersInRoom.find(p => p.id === 'p2')).toBeDefined();

    // Test with a non-existent room
    const playersInNonExistentRoom = getAllPlayersInRoom('fakeRoom');
    expect(playersInNonExistentRoom.length).toBe(0);
  });

  test('Updating and getting game state', () => {
    const newGame = new Toohak(mockQuestions, 'hostId', jest.fn());
    createRoom(MOCK_ROOM_ID, newGame);
    
    // Initially, game state might be 'waiting' (or as defined by Toohak mock)
    // For this test, we're testing the store's updateGameState function directly.
    // The actual game state values/transitions are Toohak's responsibility.
    
    const initialGameState = getGameState(MOCK_ROOM_ID);
    // We can't reliably predict initialGameState without knowing Toohak's default state,
    // or without explicitly setting it via updateGameState first.
    // However, if Toohak.gameState is public and set by constructor:
    // expect(initialGameState).toBe(newGame.gameState);


    updateGameState(MOCK_ROOM_ID, 'question');
    let gameState = getGameState(MOCK_ROOM_ID);
    expect(gameState).toBe('question');

    updateGameState(MOCK_ROOM_ID, 'leaderboard');
    gameState = getGameState(MOCK_ROOM_ID);
    expect(gameState).toBe('leaderboard');

    // Test with a non-existent room
    const updateNonExistent = updateGameState('fakeRoom', 'ended');
    expect(updateNonExistent).toBe(false); // Or handle as per function's error strategy
    const nonExistentGameState = getGameState('fakeRoom');
    expect(nonExistentGameState).toBeUndefined();
  });

  test('Operations on non-existent room', () => {
    expect(getRoom('phantomRoom')).toBeUndefined();
    expect(addPlayerToRoom('phantomRoom', 'p1', 'Phantom Player')).toBeUndefined();
    expect(getAllPlayersInRoom('phantomRoom')).toEqual([]);
    expect(updateGameState('phantomRoom', 'playing')).toBe(false); // Assuming false indicates failure
    expect(getGameState('phantomRoom')).toBeUndefined();
    expect(removeRoom('phantomRoom')).toBe(false);
  });
});
