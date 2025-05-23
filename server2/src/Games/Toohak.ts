import { Socket, Server as SocketIOServer } from "socket.io";
import { Question, Game, GameType, getRandomQuestion } from "./GameUtils";
import { GameState } from "../data/models";

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

    constructor(roomId: string, players: string[], admins: string[], io: SocketIOServer) {
        const initialPlayerData: { [playerID: string]: ToohakPlayerData; } = {};
        const initialGeneralData: ToohakGeneralData = {
            status: "waiting to start", // Changed to string literal
            currentQuestion: 0,
            questionIndex: -1,
            questionData: { question: '', options: [], correctIndex: 0 }
        };
        const gameData: ToohakGameData = {
            generalData: initialGeneralData,
            playerData: initialPlayerData
        };
        super(roomId, GameType.Toohak, gameData, io); // Updated super call
        this.resetGameState(players); // players param still used here
    }

    // subscribePlayerToEvents removed

    // isAdmin removed

    public updatePlayerScore(answerId: number, playerId: string) { // Made public
        const isCorrectAnswer = answerId == this.gameData.generalData.questionData.correctIndex;
        const playerData = this.gameData.playerData[playerId];
        playerData.answerTime = 1; // This logic might need adjustment based on how answerTime is calculated
        playerData.answeredStatus = true;
        playerData.score += isCorrectAnswer ? 1 : 0; // Simplified scoring for now
    }

    public QuestionSendState() { // Made public
        console.log("sending questions")
        this.sendNextQuestion();
        // Consider moving timer management outside or making it more robust
        setTimeout(() => this.EvaluateScoreState(), this.roundTimeInMS);
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
            status: "in game", // Changed to string literal
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
        this.io.to(this.roomId).emit('question', { questionId: index, question: selectedQuestion.question, options: selectedQuestion.options });
    }

    private endGameState() {
        this.io.to(this.roomId).emit('endGame', this.gameData);
    }

}
