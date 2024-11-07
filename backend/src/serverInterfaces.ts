export interface RoomManagementServerToClientEvents {
    playerListUpdated: (players: string[]) => void;
    kicked: (room: string) => void;
    gameStarted: (type: string, players: string[], extraInfo: any) => void;
}

export interface RoomManagementClientToServerEvents {
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
    kickPlayer: (room: string, playerId: string) => void;
    startGame: (room: string, playerId: string) => void;
}