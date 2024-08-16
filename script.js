class MinigolfApp {
    constructor() {
        this.players = [];
        this.scores = {};
        this.completedHoles = 0;
        this.isListening = false;
        this.speechRecognition = null;
        this.playerSelectionComplete = false;
        this.games = this.loadGames();
        this.currentGameId = null;

        this.initializeElements();
        this.initializeSpeechRecognition();
        this.addEventListeners();
        this.loadState();
    }

    initializeElements() {
        this.newPlayerInput = document.getElementById('newPlayerInput');
        this.addPlayerButton = document.getElementById('addPlayerButton');
        this.finishPlayerSelectionButton = document.getElementById('finishPlayerSelectionButton');
        this.playerList = document.getElementById('playerList');
        this.playerSelection = document.getElementById('playerSelection');
        this.gameArea = document.getElementById('gameArea');
        this.microphoneError = document.getElementById('microphoneError');
        this.scoreboardContainer = document.getElementById('scoreboardContainer');
        this.leaderInfo = document.getElementById('leaderInfo');
        this.speechRecognitionResult = document.getElementById('speechRecognitionResult');
        this.newGameButton = document.getElementById('newGameButton');
        this.loadGameSelect = document.getElementById('loadGameSelect');
        this.shareGameButton = document.getElementById('shareGameButton');
        this.wakeWordStatus = document.getElementById('wakeWordStatus');
        const utterance = new SpeechSynthesisUtterance('Willkommen bei Bördie! Lass uns Minigolf spielen.');
        window.speechSynthesis.speak(utterance);
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.speechRecognition = new webkitSpeechRecognition();
            this.speechRecognition.continuous = false;
            this.speechRecognition.lang = 'de-DE';
            this.speechRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("Erkannter Text:", transcript);
                this.speechRecognitionResult.textContent = `Erkannt: ${transcript}`;
                this.processVoiceCommand(transcript);
            };
            this.speechRecognition.onend = () => {
                console.log("Spracherkennung beendet");
                this.isListening = false;
            };
            this.speechRecognition.onerror = (event) => {
                console.error("Spracherkennungsfehler:", event.error);
                if (event.error === 'not-allowed') {
                    this.microphoneError.textContent = 'Mikrofonzugriff wurde verweigert. Bitte erteilen Sie die Erlaubnis in Ihren Browsereinstellungen.';
                }
                this.isListening = false;
            };
            console.log("Spracherkennung initialisiert");
            this.initializeWakeWordDetection();
        } else {
            console.log("Spracherkennung wird von diesem Browser nicht unterstützt");
            this.microphoneError.textContent = 'Ihr Browser unterstützt die Spracherkennung nicht. Bitte verwenden Sie einen modernen Browser wie Chrome.';
        }
    }

    initializeWakeWordDetection() {
        if ('webkitSpeechRecognition' in window) {
            const wakeWordRecognition = new webkitSpeechRecognition();
            wakeWordRecognition.continuous = true;
            wakeWordRecognition.lang = 'de-DE';
            wakeWordRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                if (transcript.includes('hey birdie')) {
                    console.log("Wake-word erkannt:", transcript);
                    this.wakeWordStatus.textContent = 'Wake-word erkannt: Hey, Birdie';
                    this.startListening();
                }
            };
            wakeWordRecognition.onend = () => {
                console.log("Wake-word Erkennung beendet, starte neu");
                wakeWordRecognition.start();
            };
            wakeWordRecognition.onerror = (event) => {
                console.error("Wake-word Erkennungsfehler:", event.error);
            };
            wakeWordRecognition.start();
            console.log("Wake-word Erkennung initialisiert");
        } else {
            console.log("Wake-word Erkennung wird von diesem Browser nicht unterstützt");
            this.wakeWordStatus.textContent = 'Ihr Browser unterstützt die Wake-word Erkennung nicht. Bitte verwenden Sie einen modernen Browser wie Chrome.';
        }
    }

    addEventListeners() {
        this.addPlayerButton.addEventListener('click', () => this.addPlayer());
        this.finishPlayerSelectionButton.addEventListener('click', () => this.finishPlayerSelection());
        this.newGameButton.addEventListener('click', () => this.startNewGame());
        this.loadGameSelect.addEventListener('change', () => this.loadSelectedGame());
        this.shareGameButton.addEventListener('click', () => this.shareGame());
    }

    loadState() {
        // Check for shared game in URL
        const urlParams = new URLSearchParams(window.location.search);
        const sharedGame = urlParams.get('game');
        
        if (sharedGame) {
            try {
                const gameState = JSON.parse(decodeURIComponent(sharedGame));
                this.currentGameId = Date.now().toString();
                this.games[this.currentGameId] = gameState;
                this.saveGames();
                this.loadSelectedGame();
                // Clear the URL to prevent reloading the same shared game
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Failed to load shared game:', error);
                alert('Fehler beim Laden des geteilten Spiels. Bitte überprüfen Sie den Link.');
            }
        } else {
            // Load saved games
            this.games = this.loadGames();
            this.updateGamesList();
            
            // Load last game if exists
            const lastGameId = localStorage.getItem('lastGameId');
            if (lastGameId && this.games[lastGameId]) {
                this.currentGameId = lastGameId;
                this.loadSelectedGame();
            }
        }
    }

    startListening() {
        if (this.speechRecognition && !this.isListening) {
            console.log("Starte Spracherkennung");
            this.speechRecognition.start();
            this.isListening = true;
        } else {
            console.log("Spracherkennung nicht initialisiert oder bereits aktiv");
        }
    }

    processVoiceCommand(command) {
        console.log("Verarbeite Sprachbefehl:", command);
        const lowerCommand = command.toLowerCase();
        if (lowerCommand.includes('spieler') && lowerCommand.includes('hinzufügen')) {
            const name = lowerCommand.replace(/.*spieler* ([a-zA-Z0-9]+) hinzufügen.*/, "$1").trim();
            if (name) {
                console.log("Füge Spieler hinzu:", name);
                this.addPlayer(name);
                const utterance = new SpeechSynthesisUtterance('Spieler '+name+' hinzugefügt');
                window.speechSynthesis.speak(utterance);
            }
        } else if (lowerCommand.includes('bahn abschließen')) {
            console.log("Schließe Bahn ab");
            this.completeHole();
            const utterance = new SpeechSynthesisUtterance('Bahn abgeschlossen');
            window.speechSynthesis.speak(utterance);
    } else if (lowerCommand.includes('punktzahl')) {
            const parts = lowerCommand.split(' ');
            const playerIndex = parts.findIndex(part => part === 'für') + 1;
            const scoreIndex = parts.findIndex(part => !isNaN(part));
            if (playerIndex > 0 && scoreIndex > 0 && playerIndex < scoreIndex) {
                const player = parts.slice(playerIndex, scoreIndex).join(' ');
                const score = parseInt(parts[scoreIndex]);
                if (this.players.includes(player.toLowerCase())) {
                    console.log("Aktualisiere Punktzahl:", player, score);
                    this.updateScore(player.toLowerCase(), this.completedHoles, score);
                    const utterance = new SpeechSynthesisUtterance('Spieler '+player+' hat '+score+' Schläge benötigt');
                    window.speechSynthesis.speak(utterance);
                }
            }
        }
    }

    addPlayer(name = null) {
        const playerName = name || this.newPlayerInput.value.trim();
        if (playerName && !this.players.includes(playerName)) {
            this.players.push(playerName);
            this.scores[playerName] = Array(18).fill(null);
            this.newPlayerInput.value = '';
            this.renderPlayerList();
            this.saveState();
        }
    }

    renderPlayerList() {
        this.playerList.innerHTML = this.players.map(player => `<li>${player}</li>`).join('');
    }

    finishPlayerSelection() {
        if (this.players.length > 0) {
            this.playerSelectionComplete = true;
            this.playerSelection.style.display = 'none';
            this.gameArea.style.display = 'block';
            this.renderScoreboard();
            this.saveState();
        } else {
            alert('Bitte fügen Sie mindestens einen Spieler hinzu, bevor Sie die Auswahl abschließen.');
        }
    }

    updateScore(player, hole, value) {
        this.scores[player][hole] = value === '' ? null : Math.max(0, parseInt(value) || 0);
        this.renderScoreboard();
        this.saveState();
    }

    completeHole() {
        if (this.completedHoles < 18 && this.players.every(player => this.scores[player][this.completedHoles] !== null)) {
            this.completedHoles++;
            this.renderScoreboard();
            this.saveState();
        } else {
            alert('Bitte füllen Sie die Punktzahlen für alle Spieler aus, bevor Sie die Bahn abschließen.');
        }
    }

    calculateTotal(player) {
        return this.scores[player].slice(0, this.completedHoles).reduce((sum, score) => sum + (score || 0), 0);
    }

    getLeader() {
        if (this.players.length === 0 || this.completedHoles === 0) return null;
        return this.players.reduce((leader, player) =>
            this.calculateTotal(player) < this.calculateTotal(leader) ? player : leader
        );
    }

    renderScoreboard() {
        let html = '<table><thead><tr><th>Bahn</th>';
        this.players.forEach(player => {
            html += `<th>${player}</th>`;
        });
        html += '</tr></thead><tbody>';

        for (let i = 0; i <= this.completedHoles; i++) {
            html += `<tr><td>${i + 1}</td>`;
            this.players.forEach(player => {
                const score = this.scores[player][i];
                html += `<td><input type="number" value="${score === null ? '' : score}" ${i < this.completedHoles ? 'disabled' : ''} onchange="app.updateScore('${player}', ${i}, this.value)"></td>`;
            });
            html += '</tr>';
        }

        html += '<tr><td><strong>Gesamt</strong></td>';
        this.players.forEach(player => {
            html += `<td><strong>${this.calculateTotal(player)}</strong></td>`;
        });
        html += '</tr></tbody></table>';

        html += `<div style="margin-top: 20px; text-align: center;">
            <button onclick="app.completeHole()" ${this.completedHoles >= 18 ? 'disabled' : ''}>Bahn abschließen</button>
        </div>`;

        this.scoreboardContainer.innerHTML = html;

        const leader = this.getLeader();
        if (leader) {
            this.leaderInfo.innerHTML = `<div style="margin-top: 20px; text-align: center; font-size: 18px; font-weight: bold;">
                Führender Spieler: ${leader} (Punktzahl: ${this.calculateTotal(leader)})
            </div>`;
        } else {
            this.leaderInfo.innerHTML = '';
        }
    }

    startNewGame() {
        this.currentGameId = Date.now().toString();
        this.players = [];
        this.scores = {};
        this.completedHoles = 0;
        this.playerSelectionComplete = false;
        this.renderPlayerList();
        this.playerSelection.style.display = 'block';
        this.gameArea.style.display = 'none';
        this.saveState();
        this.updateGamesList();
    }

    loadGames() {
        const savedGames = localStorage.getItem('minigolfGames');
        return savedGames ? JSON.parse(savedGames) : {};
    }

    saveGames() {
        localStorage.setItem('minigolfGames', JSON.stringify(this.games));
    }

    updateGamesList() {
        this.loadGameSelect.innerHTML = '<option value="">Spiel laden...</option>';
        Object.keys(this.games).forEach(gameId => {
            const game = this.games[gameId];
            const option = document.createElement('option');
            option.value = gameId;
            option.textContent = `Spiel vom ${new Date(parseInt(gameId)).toLocaleString()}`;
            this.loadGameSelect.appendChild(option);
        });
    }

    loadSelectedGame() {
        const gameId = this.loadGameSelect.value;
        if (gameId) {
            this.currentGameId = gameId;
            const game = this.games[gameId];
            this.players = game.players;
            this.scores = game.scores;
            this.completedHoles = game.completedHoles;
            this.playerSelectionComplete = game.playerSelectionComplete;
            this.renderScoreboard();
            this.playerSelection.style.display = 'none';
            this.gameArea.style.display = 'block';
        }
    }

    saveState() {
        const state = {
            players: this.players,
            scores: this.scores,
            completedHoles: this.completedHoles,
            playerSelectionComplete: this.playerSelectionComplete
        };
        this.games[this.currentGameId] = state;
        this.saveGames();
        localStorage.setItem('lastGameId', this.currentGameId);
    }

    shareGame() {
        const gameData = JSON.stringify(this.games[this.currentGameId]);
        const encodedData = encodeURIComponent(gameData);
        const shareUrl = `${window.location.origin}${window.location.pathname}?game=${encodedData}`;
        
        // Create a temporary input to copy the URL
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        alert('Spiel-Link wurde in die Zwischenablage kopiert. Sie können ihn nun teilen.');
    }
}

// Initialize the app
const app = new MinigolfApp();
