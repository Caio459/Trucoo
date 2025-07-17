document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do Jogo (DOM) ---
    const getEl = id => document.getElementById(id);
    const playerMatchesWonEl = getEl('player-matches-won');
    const computerMatchesWonEl = getEl('computer-matches-won');
    const playerScoreEl = getEl('player-score');
    const computerScoreEl = getEl('computer-score');
    const playerHandEl = getEl('player-hand');
    const computerHandEl = getEl('computer-hand');
    const playerCardPlayedEl = getEl('player-card-played');
    const computerCardPlayedEl = getEl('computer-card-played');
    const viraCardEl = getEl('vira-card');
    const gameMessageEl = getEl('game-message').querySelector('p');
    const playerActionsEl = getEl('player-actions');
    const trickResultsEl = getEl('trick-results');
    const roundValueDisplayEl = getEl('round-value-display');

    // --- Configurações e Lógica do Baralho ---
    const suits = ['Ouros', 'Espadas', 'Copas', 'Paus'];
    const ranks = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
    const cardStrengths = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };

    // --- Estado do Jogo ---
    let state = {};

    function setupInitialState() {
        state = {
            playerMatchesWon: 0, computerMatchesWon: 0,
            playerScore: 0, computerScore: 0,
            deck: [], playerHand: [], computerHand: [], vira: null, manilhas: [],
            roundValue: 1, gameInProgress: true, roundInProgress: false,
            currentTrick: 1, firstTrickWinner: null, trickWinners: [],
            isPlayerTurn: true, trickStarter: 'player', roundStarter: 'player',
            playerCardOnTable: null, computerCardOnTable: null,
            trucoState: 'none', challenger: null,
        };
    }

    // --- Funções de Renderização e Lógica Pura ---
    function createDeck() { state.deck = []; for(const s of suits) for(const r of ranks) state.deck.push({suit:s, rank:r}); for(let i=state.deck.length-1; i>0; i--){const j=Math.floor(Math.random()*(i+1));[state.deck[i],state.deck[j]]=[state.deck[j],state.deck[i]];} }
    function determineManilhas() { const viraIdx=ranks.indexOf(state.vira.rank); const manilhaRank=ranks[(viraIdx+1)%ranks.length]; state.manilhas=[{rank:manilhaRank,suit:'Paus',strength:14},{rank:manilhaRank,suit:'Copas',strength:13},{rank:manilhaRank,suit:'Espadas',strength:12},{rank:manilhaRank,suit:'Ouros',strength:11}]; }
    function getCardStrength(card) { const manilha = state.manilhas.find(m => m.rank === card.rank && m.suit === card.suit); return manilha ? manilha.strength : cardStrengths[card.rank]; }
    function getSuitSymbol(suit) { return {'Ouros':'♦','Espadas':'♠','Copas':'♥','Paus':'♣'}[suit]; }
    function renderPlayedCard(card, element) { element.innerHTML = ''; if (card) { const cardDiv = document.createElement('div'); cardDiv.className = 'card'; cardDiv.innerHTML = `<span>${card.rank}</span><span>${getSuitSymbol(card.suit)}</span>`; element.appendChild(cardDiv); } }
    function renderComputerHand() { computerHandEl.innerHTML = ''; state.computerHand.forEach(() => { const cardDiv = document.createElement('div'); cardDiv.className = 'card facedown'; computerHandEl.appendChild(cardDiv); }); }
    function renderPlayerHand() { playerHandEl.innerHTML = ''; state.playerHand.forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'card player-card'; cardDiv.innerHTML = `<span>${card.rank}</span><span>${getSuitSymbol(card.suit)}</span>`; cardDiv.addEventListener('click', () => playerPlayCard(card)); playerHandEl.appendChild(cardDiv); }); }
    function renderTrickHistory() { const results = trickResultsEl.children; for (let i = 0; i < 3; i++) { const winner = state.trickWinners[i]; if (winner) { results[i].textContent = `${i+1}º: ${winner === 'player' ? 'Você' : winner === 'computer' ? 'CPU' : 'Empate'}`; } else { results[i].textContent = `${i+1}º: -`; } } }
    function updateRoundValueDisplay() { if (state.roundValue > 1 && state.trucoState === 'none') { roundValueDisplayEl.textContent = `VALENDO ${state.roundValue}`; roundValueDisplayEl.classList.remove('hidden'); } else { roundValueDisplayEl.classList.add('hidden'); } }

    // --- LÓGICA DE JOGO PRINCIPAL REFEITA ---
    function playerPlayCard(card) {
        if (!state.isPlayerTurn || !state.roundInProgress || state.trucoState !== 'none') return;
        state.playerCardOnTable = card;
        state.playerHand = state.playerHand.filter(c => c !== card);
        renderPlayerHand();
        renderPlayedCard(card, playerCardPlayedEl);
        state.isPlayerTurn = false;
        if (!state.computerCardOnTable) {
            gameMessageEl.textContent = 'Vez do computador...';
            setTimeout(computerPlayCard, 1000);
        } else {
            setTimeout(evaluateTrick, 1000);
        }
    }

    function computerPlayCard() {
        if (state.isPlayerTurn || !state.roundInProgress || state.trucoState !== 'none') return;
        const canCallTruco = state.roundValue === 1 && !state.playerCardOnTable;
        if (canCallTruco) {
            const handStrength = Math.max(...state.computerHand.map(getCardStrength));
            const wantsToCall = (handStrength >= 11 && Math.random() < 0.4) || (handStrength < 11 && Math.random() < 0.15);
            if (wantsToCall) {
                handleTrucoRequest('computer');
                return;
            }
        }
        let cardToPlay;
        if (!state.playerCardOnTable) {
            let nonManilhaHand = state.computerHand.filter(c => getCardStrength(c) < 11);
            cardToPlay = nonManilhaHand.length > 0 ? nonManilhaHand.reduce((s, c) => getCardStrength(c) > getCardStrength(s) ? c : s) : state.computerHand.reduce((w, c) => getCardStrength(c) < getCardStrength(w) ? c : w);
        } else {
            const playerCardStrength = getCardStrength(state.playerCardOnTable);
            let bestCardToWin = null, weakestCard = state.computerHand[0];
            state.computerHand.forEach(card => {
                const strength = getCardStrength(card);
                if (strength > playerCardStrength && (!bestCardToWin || strength < getCardStrength(bestCardToWin))) bestCardToWin = card;
                if (strength < getCardStrength(weakestCard)) weakestCard = card;
            });
            cardToPlay = bestCardToWin || weakestCard;
        }
        state.computerCardOnTable = cardToPlay;
        state.computerHand = state.computerHand.filter(c => c !== cardToPlay);
        renderComputerHand();
        renderPlayedCard(cardToPlay, computerCardPlayedEl);
        
        if (!state.playerCardOnTable) {
            state.isPlayerTurn = true;
            gameMessageEl.textContent = 'Sua vez de jogar!';
            renderActionButtons(); // <<< CORREÇÃO APLICADA AQUI
        } else {
            setTimeout(evaluateTrick, 1000);
        }
    }
    
    function evaluateTrick() {
        if (!state.playerCardOnTable || !state.computerCardOnTable) return;
        const playerStrength = getCardStrength(state.playerCardOnTable);
        const computerStrength = getCardStrength(state.computerCardOnTable);
        let winnerOfThisTrick = (playerStrength > computerStrength) ? 'player' : (computerStrength > playerStrength) ? 'computer' : 'tie';
        
        state.trickWinners[state.currentTrick - 1] = winnerOfThisTrick;
        if (state.currentTrick === 1 && winnerOfThisTrick !== 'tie') {
            state.firstTrickWinner = winnerOfThisTrick;
        }
        
        renderTrickHistory();
        gameMessageEl.textContent = winnerOfThisTrick === 'player' ? 'Você ganhou o turno!' : winnerOfThisTrick === 'computer' ? 'Computador ganhou o turno!' : 'Empatou o turno!';
        
        setTimeout(checkForRoundEnd, 2000);
    }
    
    function checkForRoundEnd() {
        const playerWins = state.trickWinners.filter(w => w === 'player').length;
        const computerWins = state.trickWinners.filter(w => w === 'computer').length;

        let roundWinner = null;
        if (playerWins === 2) roundWinner = 'player';
        if (computerWins === 2) roundWinner = 'computer';
        if (state.trickWinners[0] === 'tie') {
            if (state.trickWinners[1] && state.trickWinners[1] !== 'tie') roundWinner = state.trickWinners[1];
        }
        if (state.currentTrick === 2 && state.trickWinners[1] === 'tie' && state.firstTrickWinner) {
            roundWinner = state.firstTrickWinner;
        }

        if (state.currentTrick === 3) {
            if (playerWins > computerWins) roundWinner = 'player';
            else if (computerWins > playerWins) roundWinner = 'computer';
            else roundWinner = state.firstTrickWinner || state.roundStarter;
        }

        if (roundWinner) {
            endRound(roundWinner);
        } else {
            startNextTrick(state.trickWinners[state.currentTrick - 1]);
        }
    }

    function startNextTrick(winner) {
        state.currentTrick++;
        state.playerCardOnTable = null; state.computerCardOnTable = null;
        renderPlayedCard(null, playerCardPlayedEl); renderPlayedCard(null, computerCardPlayedEl);
        state.trickStarter = winner === 'tie' ? state.trickStarter : winner;
        state.isPlayerTurn = (state.trickStarter === 'player');
        renderActionButtons();
        if (state.isPlayerTurn) { gameMessageEl.textContent = `Turno ${state.currentTrick}: Sua vez!`; }
        else { gameMessageEl.textContent = `Turno ${state.currentTrick}: Vez do computador...`; setTimeout(computerPlayCard, 1500); }
    }
    
    function endRound(winner) {
        state.roundInProgress = false;
        if (winner === 'player') { state.playerScore += state.roundValue; }
        else if (winner === 'computer') { state.computerScore += state.roundValue; }
        state.roundStarter = (state.roundStarter === 'player') ? 'computer' : 'player';
        updateScores();
        if (state.playerScore >= 12) { endMatch('player'); }
        else if (state.computerScore >= 12) { endMatch('computer'); }
        else {
            let winnerText = winner === 'tie' ? 'A rodada empatou!' : `${winner === 'player' ? 'Você' : 'O Computador'} ganhou a rodada!`;
            gameMessageEl.textContent = winnerText;
            renderActionButtons();
        }
    }

    function endMatch(winner) {
        if (winner === 'player') { state.playerMatchesWon++; } else { state.computerMatchesWon++; }
        updateScores();
        if (state.playerMatchesWon === 2) { endSeries('Você'); }
        else if (state.computerMatchesWon === 2) { endSeries('O Computador'); }
        else { state.gameInProgress = false; gameMessageEl.textContent = `${winner === 'player' ? 'Você' : 'O Computador'} ganhou a partida!`; renderActionButtons(); }
    }

    function endSeries(winner) { state.gameInProgress = false; gameMessageEl.textContent = `FIM DE JOGO! ${winner} VENCEU A SÉRIE!`; renderActionButtons(); }
    function updateScores() { playerScoreEl.textContent = state.playerScore; computerScoreEl.textContent = state.computerScore; playerMatchesWonEl.textContent = state.playerMatchesWon; computerMatchesWonEl.textContent = state.computerMatchesWon; }
    
    function resetSeries() {
        setupInitialState();
        updateScores();
        startNewMatch(true);
    }

    function startNewMatch(isNewSeries = false) {
        state.playerScore = 0; state.computerScore = 0;
        state.roundStarter = isNewSeries ? 'player' : state.roundStarter;
        state.gameInProgress = true;
        startNewRound();
    }
    
    function startNewRound() {
        state.roundInProgress = true; state.roundValue = 1; state.trucoState = 'none'; state.challenger = null;
        createDeck(); state.playerHand = state.deck.splice(0, 3); state.computerHand = state.deck.splice(0, 3); state.vira = state.deck.pop();
        determineManilhas(); 
        state.currentTrick = 1; state.firstTrickWinner = null; state.trickWinners = [];
        state.trickStarter = state.roundStarter; state.isPlayerTurn = (state.trickStarter === 'player');
        state.playerCardOnTable = null; state.computerCardOnTable = null;
        renderPlayedCard(null, playerCardPlayedEl); renderPlayedCard(null, computerCardPlayedEl); renderPlayedCard(state.vira, viraCardEl);
        renderPlayerHand(); renderComputerHand(); renderTrickHistory(); updateRoundValueDisplay(); 
        renderActionButtons();
        if (!state.isPlayerTurn) {
            gameMessageEl.textContent = 'Turno 1: Vez do computador...';
            setTimeout(computerPlayCard, 1500);
        } else {
            gameMessageEl.textContent = 'Turno 1: Sua vez de jogar!';
        }
    }
    
    // --- Lógica de Truco (CORRIGIDA E ESTÁVEL) ---
    function handleTrucoRequest(who) {
        if (!state.roundInProgress || state.trucoState !== 'none' || state.roundValue > 1) return;
        if (who === 'player' && !state.isPlayerTurn) return;

        state.challenger = who;
        state.roundValue = 3;
        
        if (who === 'player') {
            state.trucoState = 'pending_computer_response';
            gameMessageEl.textContent = 'TRUCO! Aguardando resposta...';
            setTimeout(computerRespondToTruco, 1500);
        } else { // Computador pediu
            state.trucoState = 'pending_player_response';
            gameMessageEl.textContent = 'O computador pediu TRUCO!';
        }
        renderActionButtons();
    }

    function computerRespondToTruco() {
        const handStrength = Math.max(...state.computerHand.map(getCardStrength));
        const nextBet = state.roundValue + 3;

        if (handStrength >= 13 && nextBet <= 12) { // Aumenta
            state.roundValue = nextBet; state.challenger = 'computer'; state.trucoState = 'pending_player_response';
            gameMessageEl.textContent = `O computador pediu ${nextBet === 6 ? 'SEIS' : 'NOVE'}!`;
        } else if (handStrength >= 11) { // Aceita
            state.trucoState = 'none';
            gameMessageEl.textContent = `O computador ACEITOU! A rodada vale ${state.roundValue} pontos.`;
            updateRoundValueDisplay();
            state.isPlayerTurn = true; // Devolve a vez para o jogador
            gameMessageEl.textContent += ' Sua vez de jogar!';
        } else { // Corre
            const pointsWon = 1;
            state.playerScore += pointsWon;
            gameMessageEl.textContent = `O computador CORREU! Você ganhou ${pointsWon} ponto.`;
            state.roundInProgress = false; state.trucoState = 'none';
            updateScores();
            if (state.playerScore >= 12) { endMatch('player'); } 
            else { renderActionButtons(); }
        }
        renderActionButtons();
    }

    function playerRespondToTruco(response) {
        if (response === 'run') {
            const pointsWon = state.roundValue === 3 ? 1 : state.roundValue - 3;
            state.computerScore += pointsWon;
            gameMessageEl.textContent = `Você CORREU! O computador ganhou ${pointsWon} ponto(s).`;
            state.roundInProgress = false; state.trucoState = 'none';
            updateScores();
            if (state.computerScore >= 12) { endMatch('computer'); } 
            else { renderActionButtons(); }
        } else if (response === 'accept') {
            state.trucoState = 'none';
            gameMessageEl.textContent = `Você ACEITOU! A rodada vale ${state.roundValue} pontos.`;
            updateRoundValueDisplay();
            state.isPlayerTurn = false; // A vez é do desafiante (computador)
            gameMessageEl.textContent += ' Vez do computador!';
            setTimeout(computerPlayCard, 1000);
        } else if (response === 'raise') {
            const nextBet = state.roundValue + 3;
            if (nextBet <= 12) {
                state.roundValue = nextBet; state.challenger = 'player'; state.trucoState = 'pending_computer_response';
                gameMessageEl.textContent = `Você pediu ${nextBet === 6 ? 'SEIS' : 'NOVE'}!`;
                setTimeout(computerRespondToTruco, 1500);
            }
        }
        renderActionButtons();
    }

    // Renderização dos Botões
    function renderActionButtons() {
        playerActionsEl.innerHTML = '';
        if (!state.gameInProgress) {
            const nextButton = document.createElement('button');
            nextButton.id = 'new-round-btn';
            if (state.playerMatchesWon < 2 && state.computerMatchesWon < 2) { nextButton.textContent = 'Próxima Partida'; nextButton.addEventListener('click', () => startNewMatch(false)); }
            else { nextButton.textContent = 'Jogar Novamente'; nextButton.addEventListener('click', resetSeries); }
            playerActionsEl.appendChild(nextButton);
        } else if (state.trucoState === 'pending_player_response') {
            const acceptBtn = document.createElement('button'); acceptBtn.textContent = 'Aceitar'; acceptBtn.className = 'action-btn accept-btn'; acceptBtn.addEventListener('click', () => playerRespondToTruco('accept')); playerActionsEl.appendChild(acceptBtn);
            const runBtn = document.createElement('button'); runBtn.textContent = 'Correr'; runBtn.className = 'action-btn run-btn'; runBtn.addEventListener('click', () => playerRespondToTruco('run')); playerActionsEl.appendChild(runBtn);
            if (state.roundValue < 12) { const raiseBtn = document.createElement('button'); raiseBtn.textContent = `Aumentar para ${state.roundValue + 3}`; raiseBtn.className = 'action-btn raise-btn'; raiseBtn.addEventListener('click', () => playerRespondToTruco('raise')); playerActionsEl.appendChild(raiseBtn); }
        } else if (state.roundInProgress) {
            if (state.trucoState === 'none' && state.roundValue === 1) {
                const trucoBtnEl = document.createElement('button');
                trucoBtnEl.id = 'truco-btn';
                trucoBtnEl.textContent = 'TRUCO!';
                trucoBtnEl.disabled = !state.isPlayerTurn;
                trucoBtnEl.addEventListener('click', () => handleTrucoRequest('player'));
                playerActionsEl.appendChild(trucoBtnEl);
            }
        } else {
            const newRoundBtnEl = document.createElement('button');
            newRoundBtnEl.id = 'new-round-btn';
            newRoundBtnEl.textContent = 'Próxima Rodada';
            newRoundBtnEl.addEventListener('click', startNewRound);
            playerActionsEl.appendChild(newRoundBtnEl);
        }
    }
    
    // Início do Jogo
    resetSeries();
});
