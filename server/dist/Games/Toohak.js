"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToohakGame = void 0;
const GameUtils_1 = require("./GameUtils");
class ToohakGame extends GameUtils_1.Game {
    constructor(roomId, players, admins, socket) {
        const initialPlayerData = {};
        const initialGeneralData = {
            status: GameUtils_1.GameState.waiting,
            currentQuestion: 0,
            questionIndex: -1,
            questionData: { question: '', options: [], correctIndex: 0 }
        };
        const gameData = {
            generalData: initialGeneralData,
            playerData: initialPlayerData
        };
        super(roomId, GameUtils_1.GameType.Trivia, players, admins, gameData, socket);
        this.roundTimeInMS = 10000;
        this.gameType = GameUtils_1.GameType.Toohak;
        this.resetGameState(players);
    }
    subscribePlayerToEvents(playerSocket) {
        playerSocket.on('submitAnswer', (questionId, answerId) => {
            const playerId = playerSocket.id;
            if (questionId == this.gameData.generalData.questionIndex)
                this.updatePlayerScore(answerId, playerId);
        });
        if (true /*this.isAdmin(playerSocket)*/) {
            console.log("Admin here");
            playerSocket.on('startQuestions', () => {
                this.QuestionSendState();
            });
        }
    }
    isAdmin(playerSocket) {
        //console.table(this.adminsSockets.map(socket => socket.id))
        //console.log(playerSocket.id)
        this.adminsSockets.forEach(adminSocket => {
            if (adminSocket.id == playerSocket.id)
                return true;
        });
        return false;
    }
    updatePlayerScore(answerId, playerId) {
        const isCorrectAnswer = answerId == this.gameData.generalData.questionData.correctIndex;
        const playerData = this.gameData.playerData[playerId];
        playerData.answerTime = 1;
        playerData.answeredStatus = true;
        playerData.score += isCorrectAnswer ? playerData.answerTime : 0;
    }
    QuestionSendState() {
        console.log("sending questions");
        this.sendNextQuestion();
        let timer = setTimeout(this.EvaluateScoreState, this.roundTimeInMS);
        //clearTimeout(timer);
    }
    EvaluateScoreState() {
        this.gameData.generalData.currentQuestion++;
        Object.values(this.gameData.playerData).forEach(playerData => {
            if (!playerData.answeredStatus) { //if player didn't answer
                //TODO set score as zero for player
            }
        });
        const shouldSendNextQuestion = this.gameData.generalData.currentQuestion < ToohakGame.numberOfQuestions;
        if (shouldSendNextQuestion) {
            this.QuestionSendState();
        }
        else {
            this.endGameState();
        }
    }
    resetGameState(players) {
        const [questionData, index] = (0, GameUtils_1.getRandomQuestion)();
        this.gameData.generalData = {
            status: GameUtils_1.GameState.active,
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
    sendNextQuestion() {
        const [selectedQuestion, index] = (0, GameUtils_1.getRandomQuestion)();
        this.gameData.generalData.questionData = selectedQuestion;
        this.gameData.generalData.questionIndex = index;
        this.socket.to(this.roomId).emit('question', { questionId: index, question: selectedQuestion.question, options: selectedQuestion.options });
    }
    endGameState() {
        this.socket.to(this.roomId).emit('endGame', this.gameData);
    }
}
exports.ToohakGame = ToohakGame;
ToohakGame.numberOfQuestions = 5;
