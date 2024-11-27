"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaGame = exports.Game = exports.GameType = void 0;
const utils_1 = require("../utils");
var GameType;
(function (GameType) {
    GameType["None"] = "None";
    GameType["Trivia"] = "Trivia";
})(GameType || (exports.GameType = GameType = {}));
class Game {
    constructor(gameType, players, initialPlayerData) {
        this.gameType = gameType;
        this.gameData = initialPlayerData;
        this.playersSockets = players.map(utils_1.socketIdToSocket);
        this.setupGameEvents();
    }
    getGameType() {
        return this.gameType;
    }
    setupGameEvents() {
        this.playersSockets.forEach((playerSocket) => {
            this.subscribePlayerToEvents(playerSocket);
        });
    }
}
exports.Game = Game;
const questions = [
    { question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correctIndex: 2 },
    { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
    { question: "Who wrote 'Romeo and Juliet'?", options: ["William Wordsworth", "Charles Dickens", "William Shakespeare", "Jane Austen"], correctIndex: 2 },
    { question: "What is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], correctIndex: 3 },
    { question: "What is the square root of 64?", options: ["6", "7", "8", "9"], correctIndex: 2 },
    { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], correctIndex: 2 },
    { question: "What is the chemical symbol for water?", options: ["H2O", "CO2", "O2", "NaCl"], correctIndex: 0 },
    { question: "In which year did the Titanic sink?", options: ["1912", "1905", "1921", "1918"], correctIndex: 0 },
    { question: "How many continents are there?", options: ["5", "6", "7", "8"], correctIndex: 2 },
    { question: "Which element does 'O' represent on the periodic table?", options: ["Gold", "Oxygen", "Osmium", "Ozone"], correctIndex: 1 },
    { question: "Which organ in the human body is responsible for pumping blood?", options: ["Liver", "Heart", "Brain", "Kidneys"], correctIndex: 1 },
    { question: "What is the fastest land animal?", options: ["Cheetah", "Lion", "Horse", "Elephant"], correctIndex: 0 },
    { question: "How many degrees are in a circle?", options: ["90", "180", "270", "360"], correctIndex: 3 },
    { question: "Who developed the theory of relativity?", options: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Niels Bohr"], correctIndex: 1 },
    { question: "Which country is known as the Land of the Rising Sun?", options: ["China", "Japan", "South Korea", "Thailand"], correctIndex: 1 },
    { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Graphite"], correctIndex: 2 },
    { question: "Who is the author of 'Harry Potter'?", options: ["J.K. Rowling", "J.R.R. Tolkien", "Stephen King", "George R.R. Martin"], correctIndex: 0 },
    { question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctIndex: 1 },
    { question: "Which gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"], correctIndex: 2 },
    { question: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correctIndex: 1 },
    { question: "Who discovered penicillin?", options: ["Marie Curie", "Alexander Fleming", "Isaac Newton", "Louis Pasteur"], correctIndex: 1 },
    { question: "What currency is used in Japan?", options: ["Yen", "Won", "Dollar", "Euro"], correctIndex: 0 },
    { question: "What is the main language spoken in Brazil?", options: ["Spanish", "English", "Portuguese", "French"], correctIndex: 2 },
    { question: "What is the largest desert in the world?", options: ["Sahara", "Gobi", "Antarctic", "Kalahari"], correctIndex: 2 },
    { question: "What is the smallest unit of matter?", options: ["Molecule", "Atom", "Cell", "Electron"], correctIndex: 1 },
    { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correctIndex: 2 },
    { question: "Which planet is closest to the sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctIndex: 2 },
    { question: "How many players are there in a football (soccer) team?", options: ["9", "10", "11", "12"], correctIndex: 2 },
    { question: "Which animal is known as the King of the Jungle?", options: ["Tiger", "Elephant", "Lion", "Cheetah"], correctIndex: 2 },
    { question: "What is the national flower of Japan?", options: ["Tulip", "Cherry Blossom", "Rose", "Sunflower"], correctIndex: 1 },
    { question: "Which city is known as the Big Apple?", options: ["Los Angeles", "Chicago", "New York", "Miami"], correctIndex: 2 },
    { question: "Who was the first man to step on the moon?", options: ["Yuri Gagarin", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"], correctIndex: 2 },
    { question: "What is the boiling point of water in Celsius?", options: ["90°C", "95°C", "100°C", "110°C"], correctIndex: 2 },
    { question: "Which element is known as the 'King of Chemicals'?", options: ["Sodium", "Sulfur", "Ammonia", "Hydrochloric Acid"], correctIndex: 3 },
    { question: "Who painted the ceiling of the Sistine Chapel?", options: ["Raphael", "Michelangelo", "Donatello", "Leonardo da Vinci"], correctIndex: 1 },
    { question: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctIndex: 1 },
    { question: "What is the process by which plants make their food?", options: ["Photosynthesis", "Respiration", "Digestion", "Fermentation"], correctIndex: 0 },
    { question: "What is the smallest bone in the human body?", options: ["Stapes", "Femur", "Humerus", "Radius"], correctIndex: 0 },
    { question: "Which country hosted the 2016 Summer Olympics?", options: ["Russia", "Brazil", "Japan", "China"], correctIndex: 1 },
    { question: "What is the primary ingredient in guacamole?", options: ["Tomato", "Onion", "Avocado", "Pepper"], correctIndex: 2 },
    { question: "How many time zones does Russia have?", options: ["7", "9", "11", "13"], correctIndex: 2 },
    { question: "What does DNA stand for?", options: ["Deoxyribonucleic Acid", "Digital Network Architecture", "Dynamic Neural Assembly", "Dual Neuron Array"], correctIndex: 0 },
    { question: "What color is a ruby?", options: ["Blue", "Green", "Red", "Yellow"], correctIndex: 2 },
    { question: "Who directed 'Jurassic Park'?", options: ["James Cameron", "Christopher Nolan", "Steven Spielberg", "George Lucas"], correctIndex: 2 },
    { question: "Which planet has the most moons?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 3 },
    { question: "How many colors are there in a rainbow?", options: ["5", "6", "7", "8"], correctIndex: 2 },
    { question: "Which famous scientist introduced the three laws of motion?", options: ["Galileo Galilei", "Albert Einstein", "Nikola Tesla", "Isaac Newton"], correctIndex: 3 },
    { question: "Which language has the most native speakers?", options: ["English", "Mandarin", "Spanish", "Hindi"], correctIndex: 1 },
    { question: "What is the capital city of Australia?", options: ["Sydney", "Melbourne", "Perth", "Canberra"], correctIndex: 3 }
];
class TriviaGame extends Game {
    constructor(players) {
        const initialPlayerData = {};
        const initialGeneralData = {};
        const gameData = {
            generalData: initialGeneralData,
            playerData: initialPlayerData
        };
        super(GameType.Trivia, players, gameData);
        this.resetGameState(players);
    }
    resetGameState(players) {
        this.gameData.generalData = {};
        this.gameData.playerData = {};
        players.forEach(playerId => {
            this.gameData.playerData[playerId] = { score: 0, questionsLeft: TriviaGame.numberOfInitialQuestions };
        });
    }
    subscribePlayerToEvents(playerSocket) {
        playerSocket.on('submitAnswer', (answerId, callback) => {
            const isCorrectAnswer = answerId == 1;
            this.updatePlayerState(playerSocket.id, isCorrectAnswer);
            if (this.gameData.playerData[playerSocket.id].questionsLeft > 0) {
                const selectedQuestion = this.getRandomQuestion();
                callback(isCorrectAnswer, selectedQuestion, this.gameData.playerData[playerSocket.id]);
            }
            else {
                playerSocket.emit('endGame', this.gameData.playerData[playerSocket.id]);
            }
        });
        playerSocket.on('getQuestion', (callback) => {
            const selectedQuestion = this.getRandomQuestion();
            // Send the question and options via the callback
            callback(selectedQuestion.question, selectedQuestion.options, this.gameData.playerData[playerSocket.id]);
        });
    }
    getRandomQuestion() {
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[randomIndex];
        return selectedQuestion;
    }
    updatePlayerState(playerId, isCorrectAnswer) {
        var playerData = this.gameData.playerData[playerId];
        playerData.questionsLeft--;
        if (isCorrectAnswer)
            playerData.score++;
    }
}
exports.TriviaGame = TriviaGame;
TriviaGame.numberOfInitialQuestions = 5;
