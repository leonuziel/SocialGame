import { Server as SocketIOServer } from "socket.io";
import { Question, Game, GameType, getRandomQuestion } from "./GameUtils";
import { GameState, Player } from "../data/models";
import { IGame, PlayerActionPayload, GameInitializationOptions } from "./IGame";

type ToohakPlayerData = {
    name: string;
    score: number;
    answeredStatus: boolean;
    answerTime: number; // Time taken to answer, or a score factor
};

type ToohakGeneralData = {
    status: GameState;
    currentQuestion: number; // 0-indexed count of questions asked
    questionIndex: number;   // Index of the current question in the 'questions' array
    questionData: Question;  // The actual current question object
};

// This remains the internal data structure for ToohakGame
export type ToohakGameData = {
    generalData: ToohakGeneralData;
    playerData: { [playerId: string]: ToohakPlayerData; };
};

export class ToohakGame extends Game<ToohakGeneralData, ToohakPlayerData> implements IGame {
    static readonly defaultNumberOfQuestions = 5;
    static readonly defaultRoundTimeInMS = 10000;

    private adminIds: string[] = [];
    private playerIdsForGame: string[] = [];
    private roundTimer: NodeJS.Timeout | null = null;
    private numberOfQuestions: number;
    private roundTimeInMS: number;

    constructor(roomId: string, io: SocketIOServer) {
        const initialGeneralData: ToohakGeneralData = {
            status: "waiting to start", // Initial status before 'initialize'
            currentQuestion: 0,
            questionIndex: -1,
            questionData: { question: '', options: [], correctIndex: -1 } // Placeholder
        };
        const initialPlayerData: { [playerID: string]: ToohakPlayerData; } = {};

        super(roomId, GameType.Toohak, { generalData: initialGeneralData, playerData: initialPlayerData }, io);
        
        // Default game settings, can be overridden in initialize() by options
        this.numberOfQuestions = ToohakGame.defaultNumberOfQuestions;
        this.roundTimeInMS = ToohakGame.defaultRoundTimeInMS;
    }

    // --- IGame Implementation ---

    public initialize(playersModels: Player[], options: GameInitializationOptions, io: SocketIOServer): void {
        // this.io is set by the base 'Game' class constructor. No need to re-assign ioParam.
        this.adminIds = options.adminIds as string[] || (playersModels.length > 0 ? [playersModels[0].id] : []);
        this.playerIdsForGame = playersModels.map(p => p.id);

        // Override defaults if provided in options
        this.numberOfQuestions = options.numberOfQuestions as number || ToohakGame.defaultNumberOfQuestions;
        this.roundTimeInMS = options.roundTimeInMS as number || ToohakGame.defaultRoundTimeInMS;

        this.gameData.playerData = {};
        this.playerIdsForGame.forEach(playerId => {
            const playerModel = playersModels.find(p => p.id === playerId);
            this.gameData.playerData[playerId] = {
                name: playerModel ? playerModel.username : playerId,
                score: 0,
                answeredStatus: false,
                answerTime: -1,
            };
        });
        this.gameData.generalData.status = "ready";
        console.log(`[ToohakGame ${this.roomId}] Initialized. Players: ${this.playerIdsForGame.join(', ')}. Admins: ${this.adminIds.join(', ')}. Questions: ${this.numberOfQuestions}. Round time: ${this.roundTimeInMS}ms.`);
    }

    public startGameCycle(): void {
        if (this.gameData.generalData.status !== "ready") {
            console.warn(`[ToohakGame ${this.roomId}] startGameCycle called when game not in ready state. Status: ${this.gameData.generalData.status}`);
            return;
        }
        this.gameData.generalData.status = "in game";
        this.gameData.generalData.currentQuestion = 0; // Reset question count for this cycle

        // Ensure player scores are reset for a new game cycle
        this.playerIdsForGame.forEach(playerId => {
            if (this.gameData.playerData[playerId]) {
                this.gameData.playerData[playerId].score = 0;
                this.gameData.playerData[playerId].answeredStatus = false;
                this.gameData.playerData[playerId].answerTime = -1;
            } else { // Should ideally be initialized in initialize()
                this.gameData.playerData[playerId] = { name: playerId, score: 0, answeredStatus: false, answerTime: -1 };
            }
        });
        
        console.log(`[ToohakGame ${this.roomId}] Game cycle started. Status: ${this.gameData.generalData.status}`);
        this.proceedToNextQuestion();
    }

    public concludeGame(conclusionReason?: string): void {
        if (this.roundTimer) clearTimeout(this.roundTimer);
        this.gameData.generalData.status = "concluded";
        this.emitToRoom('gameConcluded', { 
            reason: conclusionReason || 'Normal completion',
            finalScores: this.gameData.playerData 
        }); // Send final scores
        console.log(`[ToohakGame ${this.roomId}] Game concluded. Reason: ${conclusionReason || 'Normal completion'}`);
    }

    public async handlePlayerAction(playerId: string, action: PlayerActionPayload): Promise<{ success: boolean; message?: string; data?: any }> {
        if (this.gameData.generalData.status !== "in game") {
            return { success: false, message: "Game is not currently in progress." };
        }

        switch (action.actionType) {
            case "submitAnswer":
                if (typeof action.questionId !== 'number' || typeof action.answerId !== 'number') {
                    return { success: false, message: "Invalid payload for submitAnswer." };
                }
                if (this.gameData.generalData.questionIndex !== action.questionId) {
                    return { success: false, message: "Answer for incorrect or outdated question." };
                }
                const playerData = this.gameData.playerData[playerId];
                if (!playerData) {
                    return { success: false, message: "Player not found in this game." };
                }
                if (playerData.answeredStatus) {
                    return { success: false, message: "You have already answered this question." };
                }
                
                this.updatePlayerScoreAfterAnswer(action.answerId as number, playerId);
                this.emitToRoom('playerAnswered', { playerId, questionId: action.questionId }); // Notify room

                // Check if all active players have answered
                const allAnswered = this.playerIdsForGame.every(pId => this.gameData.playerData[pId]?.answeredStatus);
                if (allAnswered) {
                    if (this.roundTimer) clearTimeout(this.roundTimer); // All answered, proceed immediately
                    this.EvaluateScoreState();
                }
                return { success: true, message: "Answer submitted." };

            // Note: "startQuestionCycle" is a game lifecycle method, not a typical player action.
            // It's initiated by an admin, usually via a more specific socket event that calls `gameInstance.startGameCycle()`
            // If it must be a player action, it would be:
            // case "adminStartCycle":
            //     if (!this.adminIds.includes(playerId)) {
            //         return { success: false, message: "Only admin can start the question cycle." };
            //     }
            //     this.startGameCycle(); // Assuming current game state is 'ready'
            //     return { success: true, message: "Question cycle started by admin." };

            default:
                console.warn(`[ToohakGame ${this.roomId}] Unknown actionType: ${action.actionType}`);
                return { success: false, message: `Unknown actionType: ${action.actionType}` };
        }
    }

    public getGameStateForClient(): any {
        // Omits correctIndex from questionData for active questions
        const clientQuestionData = { ...this.gameData.generalData.questionData };
        if (this.gameData.generalData.status === "in game") {
            delete (clientQuestionData as any).correctIndex;
        }

        return {
            roomId: this.roomId,
            gameType: this.gameType,
            status: this.gameData.generalData.status,
            currentQuestionNum: this.gameData.generalData.currentQuestion + 1, // 1-indexed for client
            questionData: clientQuestionData,
            questionIndex: this.gameData.generalData.questionIndex,
            playerData: this.gameData.playerData,
            totalQuestions: this.numberOfQuestions,
            roundTime: this.roundTimeInMS,
            adminIds: this.adminIds
        };
    }
    
    public getInternalGameData(): ToohakGameData {
        return this.gameData;
    }

    public getCurrentState(): GameState {
        return this.gameData.generalData.status;
    }

    // --- Toohak Specific Methods ---

    private updatePlayerScoreAfterAnswer(answerId: number, playerId: string): void {
        const playerData = this.gameData.playerData[playerId];
        if (!playerData) return;

        const isCorrectAnswer = answerId === this.gameData.generalData.questionData.correctIndex;
        // Simple scoring: 1 point for correct, 0 for incorrect.
        // Could add time-based scoring here if 'answerTime' was set meaningfully (e.g., time remaining).
        playerData.score += isCorrectAnswer ? 1 : 0;
        playerData.answeredStatus = true;
        // playerData.answerTime could be set here based on when answer was received vs. question sent.
        console.log(`[ToohakGame ${this.roomId}] Player ${playerId} answered. Correct: ${isCorrectAnswer}. New score: ${playerData.score}`);
    }
    
    private EvaluateScoreState(): void {
        if (this.gameData.generalData.status !== "in game") return; // Ensure game is still active

        // Reveal correct answer and scores for the round
        this.emitToRoom('roundEnded', {
            questionIndex: this.gameData.generalData.questionIndex,
            correctIndex: this.gameData.generalData.questionData.correctIndex,
            playerScores: this.gameData.playerData // Send all player data (includes scores and answered status)
        });

        // Increment question count (actual questions asked so far)
        this.gameData.generalData.currentQuestion++;

        // Reset answered status for all players for the next round
        this.playerIdsForGame.forEach(pId => {
            if (this.gameData.playerData[pId]) {
                this.gameData.playerData[pId].answeredStatus = false;
                this.gameData.playerData[pId].answerTime = -1;
            }
        });
        
        // Decide next step
        if (this.gameData.generalData.currentQuestion >= this.numberOfQuestions) {
            this.concludeGame("All questions answered.");
        } else {
            // Wait a bit before sending next question (e.g., show scores for a few seconds)
            setTimeout(() => {
                if (this.gameData.generalData.status === "in game") { // Check again, game might have been force-concluded
                     this.proceedToNextQuestion();
                }
            }, 3000); // 3-second delay to show scores
        }
    }

    private proceedToNextQuestion(): void {
        const [selectedQuestion, newQuestionIndex] = getRandomQuestion(this.gameData.generalData.questionIndex); // Pass current to avoid immediate repeat
        
        this.gameData.generalData.questionData = selectedQuestion;
        this.gameData.generalData.questionIndex = newQuestionIndex;
        
        // Reset answered status for all players (should have been done in EvaluateScoreState, but good as a safeguard)
        this.playerIdsForGame.forEach(pId => {
            if (this.gameData.playerData[pId]) {
                this.gameData.playerData[pId].answeredStatus = false;
            }
        });

        this.emitToRoom('newQuestion', {
            questionId: newQuestionIndex, // This is the index in the global questions array
            questionText: selectedQuestion.question,
            options: selectedQuestion.options,
            currentQuestionNum: this.gameData.generalData.currentQuestion + 1, // 1-indexed for client
            totalQuestions: this.numberOfQuestions
        });
        console.log(`[ToohakGame ${this.roomId}] Sent question ${this.gameData.generalData.currentQuestion + 1}: ${selectedQuestion.question}`);

        if (this.roundTimer) clearTimeout(this.roundTimer);
        this.roundTimer = setTimeout(() => {
             if (this.gameData.generalData.status === "in game") {
                this.EvaluateScoreState();
             }
        }, this.roundTimeInMS);
    }

    // emitToRoom is inherited from the base Game class if GameUtils.Game is adapted,
    // or if not, ToohakGame uses this.io.to(this.roomId).emit directly.
    // For IGame compliance, let's ensure it's available.
    // Base 'Game' class already has this.io and this.roomId
    public emitToRoom(event: string, ...args: any[]): void {
        this.io.to(this.roomId).emit(event, ...args);
    }

    // Modify getRandomQuestion in GameUtils.ts to accept an optional parameter to avoid direct repeats
    // For now, this is handled by ToohakGame; GameUtils.getRandomQuestion remains simple.
}
