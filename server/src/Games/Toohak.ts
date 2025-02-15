import { Socket } from "socket.io";
import { GameState, Question, Game, GameType, getRandomQuestion } from "./GameUtils";

type ToohakPlayerData = {
    name: string;
    score: number;
    answeredStatus: boolean;
    answerTime: number;
};
type ToohakGeneralData = {
    status: GameState;
    currentQuestion: number;
    questionIndex: number;
    questionData: Question;
};
type ToohakGameData = {
    generalData: ToohakGeneralData;
    playerData: { [playerId: string]: ToohakPlayerData; };
};


export class ToohakGame extends Game<ToohakGeneralData, ToohakPlayerData> {
    static numberOfQuestions = 5;
    roundTimeInMS = 10000;

    constructor(roomId: string, players: string[], admins: string[], socket: Socket) {
        const initialPlayerData: { [playerID: string]: ToohakPlayerData; } = {};
        const initialGeneralData: ToohakGeneralData = {
            status: GameState.waiting,
            currentQuestion: 0,
            questionIndex: -1,
            questionData: { question: '', options: [], correctIndex: 0 }
        };
        const gameData: ToohakGameData = {
            generalData: initialGeneralData,
            playerData: initialPlayerData
        };
        super(roomId, GameType.Trivia, players, admins, gameData, socket);
        this.gameType = GameType.Toohak
        this.resetGameState(players);
    }

    protected subscribePlayerToEvents(playerSocket: Socket): void {
        playerSocket.on('submitAnswer', (questionId: number, answerId: number) => {
            const playerId = playerSocket.id;
            if (questionId == this.gameData.generalData.questionIndex)
                this.updatePlayerScore(answerId, playerId);
        });
        if (true/*this.isAdmin(playerSocket)*/) {
            console.log("Admin here")
            playerSocket.on('startQuestions', () => {
                this.QuestionSendState();
            });
        }
    }

    isAdmin(playerSocket: Socket): boolean {
        //console.table(this.adminsSockets.map(socket => socket.id))
        //console.log(playerSocket.id)
        this.adminsSockets.forEach(adminSocket => {
            if (adminSocket.id == playerSocket.id) return true
        })
        return false
    }

    private updatePlayerScore(answerId: number, playerId: string) {
        const isCorrectAnswer = answerId == this.gameData.generalData.questionData.correctIndex;
        const playerData = this.gameData.playerData[playerId];
        playerData.answerTime = 1;
        playerData.answeredStatus = true;
        playerData.score += isCorrectAnswer ? playerData.answerTime : 0;
    }

    private QuestionSendState() {
        console.log("sending questions")
        this.sendNextQuestion();
        let timer: ReturnType<typeof setTimeout> = setTimeout(this.EvaluateScoreState, this.roundTimeInMS);
        //clearTimeout(timer);
    }

    private EvaluateScoreState(): void {
        this.gameData.generalData.currentQuestion++;
        Object.values(this.gameData.playerData).forEach(playerData => {
            if (!playerData.answeredStatus) { //if player didn't answer
                //TODO set score as zero for player
            }
        });
        const shouldSendNextQuestion = this.gameData.generalData.currentQuestion < ToohakGame.numberOfQuestions;
        if (shouldSendNextQuestion) {
            this.QuestionSendState();
        } else {
            this.endGameState();
        }
    }

    private resetGameState(players: string[]): void {
        const [questionData, index] = getRandomQuestion();
        this.gameData.generalData = {
            status: GameState.active,
            currentQuestion: 0,
            questionData: questionData,
            questionIndex: index
        };
        this.gameData.playerData = {};
        players.forEach(playerId => {
            this.gameData.playerData[playerId] = {
                name: playerId,
                score: 0,
                answeredStatus: false,
                answerTime: -1
            };
        });
        this.sendNextQuestion();
    }



    //#region Extending API
    private sendNextQuestion() {
        const [selectedQuestion, index] = getRandomQuestion();
        this.gameData.generalData.questionData = selectedQuestion;
        this.gameData.generalData.questionIndex = index;
        this.socket.to(this.roomId).emit('question', { questionId: index, question: selectedQuestion.question, options: selectedQuestion.options });
    }

    private endGameState() {
        this.socket.to(this.roomId).emit('endGame', this.gameData);
    }

}
