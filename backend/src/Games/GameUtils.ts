import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { SocialGameSocket, socketIdToSocket } from '../utils';

export enum GameType {
    None = 'None',
    Trivia = 'Trivia'
}


export abstract class Game {
    protected gameType: GameType;
    protected playersSockets: SocialGameSocket[];


    protected constructor(gameType: GameType, players: string[]) {
        this.gameType = gameType;
        this.playersSockets = players.map(socketIdToSocket);
        this.setupGameEvents();
    }

    public getGameType() {
        return this.gameType;
    }

    private setupGameEvents(): void {
        this.playersSockets.forEach(playerSocket => {
            this.subscribePlayerToEvents(playerSocket);
        });
    }

    abstract subscribePlayerToEvents(playerSocket: Socket): void;

}

export class TriviaGame extends Game {

    constructor(players: string[]) {
        super(GameType.Trivia, players);
    }

    subscribePlayerToEvents(playerSocket: Socket) {
        playerSocket.on('submitAnswer', (answerId: number, callback: (isTrue: boolean) => void) => {
            const isCorrectAnswer = answerId == 1;
            callback(isCorrectAnswer);
        });
        playerSocket.on('getQuestion', (callback: (
            question: string,
            choices: string[]
        ) => void) => {
            callback("test question??", ['option 1', 'option 2', 'option 3', 'option 4']);
        });
    }
}



