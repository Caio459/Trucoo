document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do Jogo (DOM) ---
    const playerMatchesWonEl = document.getElementById('player-matches-won');
    const computerMatchesWonEl = document.getElementById('computer-matches-won');
    const playerScoreEl = document.getElementById('player-score');
    const computerScoreEl = document.getElementById('computer-score');
    const playerHandEl = document.getElementById('player-hand');
    const computerHandEl = document.getElementById('computer-hand');
    const playerCardPlayedEl = document.getElementById('player-card-played');
    const computerCardPlayedEl = document.getElementById('computer-card-played');
    const viraCardEl = document.getElementById('vira-card');
    const gameMessageEl = document.getElementById('game-message').querySelector('p');
    const playerActionsEl = document.getElementById('player-actions');
    const trickResultsEl = document.getElementById('trick-results');
    const roundValueDisplayEl = document.getElementById('round-value-display');

    // --- Configurações e Lógica do Baralho ---
    const suits = ['Ouros', 'Espadas', 'Copas', 'Paus'];
    const ranks = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
    const cardStrengths = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };

    // --- Estado do Jogo ---
    let playerMatchesWon = 0, computerMatchesWon = 0;
    let playerScore = 0, computerScore = 0;
    let deck = [], playerHand = [], computerHand = [], vira = null, manilhas = [];
    let roundValue = 1, gameInProgress = true, roundInProgress = false;
    let currentTrick = 1, firstTrickWinner = null, trickWinners = [];
    let isPlayerTurn = true, trickStarter = 'player', roundStarter = 'player';
    let playerCardOnTable = null, computerCardOnTable = null;
    let trucoState = 'none', challenger = null;

    // --- Funções de Renderização (sem alteração) ---
    function createDeck() { deck = []; for(const s of suits) for(const r of ranks) deck.push({suit:s, rank:r}); for(let i=deck.length-1; i>0; i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];} }
    function determineManilhas() { const viraIdx=ranks.indexOf(vira.rank); const manilhaRank=ranks[(viraIdx+1)%ranks.length]; manilhas=[{rank:manilhaRank,suit:'Paus',strength:14},{rank:manilhaRank,suit:'Copas',strength:13},{rank:manilhaRank,suit:'Espadas',strength:12},{rank:manilhaRank,suit:'Ouros',strength:11}]; }
    function getCardStrength(card) { const manilha = manilhas.find(m => m.rank === card.rank && m.suit === card.suit); return manilha ? manilha.strength : cardStrengths[card.rank]; }
    function getSuitSymbol(suit) { return {'Ouros':'♦','Espadas':'♠','Copas':'♥','Paus':'♣'}[suit]; }
    function renderPlayedCard(card, element) { element.innerHTML = ''; if (card) { const cardDiv = document.createElement('div'); cardDiv.className = 'card'; cardDiv.innerHTML = `<span>${card.rank}</span><span>${getSuitSymbol(card.suit)}</span>`; element.appendChild(cardDiv); } }
    function renderComputerHand() { computerHandEl.innerHTML = ''; computerHand.forEach(() => { const cardDiv = document.createElement('div'); cardDiv.className = 'card facedown'; computerHandEl.appendChild(cardDiv); }); }
    function renderPlayerHand() { playerHandEl.innerHTML = ''; playerHand.forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'card player-card'; cardDiv.innerHTML = `<span>${card.rank}</span><span>${getSuitSymbol(card.suit)}</span>`; cardDiv.addEventListener('click', () => playerPlayCard(card)); playerHandEl.appendChild(cardDiv); }); }
    function renderTrickHistory() { const results = trickResultsEl.children; for (let i = 0; i < 3; i++) { const winner = trickWinners[i]; if (winner) { results[i].textContent = `${i+1}º: ${winner === 'player' ? 'Você' : winner === 'computer' ? 'CPU' : 'Empate'}`; } else { results[i].textContent = `${i+1}º: -`; } } }
    function updateRoundValueDisplay() { if (roundValue > 1 && trucoState === 'none') { roundValueDisplayEl.textContent = `VALENDO ${roundValue}`; roundValueDisplayEl.classList.remove('hidden'); } else { roundValueDisplayEl.classList.add('hidden'); } }

    // --- LÓGICA DE JOGO PRINCIPAL REFEITA ---

    function playerPlayCard(card) {
        if (!isPlayerTurn || !roundInProgress || trucoState !== 'none') return;
        playerCardOnTable = card;
        renderPlayedCard(card, playerCardPlayedEl);
        playerHand = playerHand.filter(c => c !== card);
        renderPlayerHand();
        isPlayerTurn = false;
        
        // Se a mesa do computador está vazia, é a vez dele. Senão, avalia.
        if (!computerCardOnTable) {
            gameMessageEl.textContent = 'Vez do computador...';
            setTimeout(computerPlayCard, 1000);
        } else {
            setTimeout(evaluateTrick, 1000);
        }
    }

    function computerPlayCard() {
        if (isPlayerTurn || !roundInProgress || trucoState !== 'none') return;

        // Lógica da IA para pedir truco (pode ser chamada no início do turno)
        const canCallTruco = roundValue === 1 && !playerCardOnTable;
        if (canCallTruco) {
            const handStrength = Math.max(...computerHand.map(getCardStrength));
            const wantsToCall = (handStrength >= 11 && Math.random() < 0.4) || (handStrength < 11 && Math.random() < 0.15);
            if (wantsToCall) {
                handleTrucoRequest('computer');
                return; // Para a execução para esperar a resposta do jogador
            }
        }

        // Lógica da IA para escolher a carta
        let cardToPlay;
        if (!playerCardOnTable) { // Se o computador começa o turno
            cardToPlay = computerHand.reduce((strongest, current) => getCardStrength(current) > getCardStrength(strongest) ? current : strongest);
        } else { // Se o computador responde
            const playerCardStrength = getCardStrength(playerCardOnTable);
            let bestCardToWin = null;
            let weakestCard = computerHand[0];
            computerHand.forEach(card => {
                const strength = getCardStrength(card);
                if (strength > playerCardStrength && (!bestCardToWin || strength < getCardStrength(bestCardToWin))) {
                    bestCardToWin = card;
                }
                if (strength < getCardStrength(weakestCard)) {
                    weakestCard = card;
                }
            });
            cardToPlay = bestCardToWin || weakestCard;
        }
        
        computerCardOnTable = cardToPlay;
        renderPlayedCard(cardToPlay, computerCardPlayedEl);
        computerHand = computerHand.filter(c => c !== cardToPlay);
        renderComputerHand();
        isPlayerTurn = true;

        // Se a mesa do jogador está vazia, é a vez dele. Senão, avalia.
        if (!playerCardOnTable) {
            gameMessageEl.textContent = 'Sua vez de jogar!';
        } else {
            setTimeout(evaluateTrick, 1000);
        }
    }

    // AVALIA O TURNO E DECIDE O PRÓXIMO PASSO
    function evaluateTrick() {
        if (!playerCardOnTable || !computerCardOnTable) return;
        
        const playerStrength = getCardStrength(playerCardOnTable);
        const computerStrength = getCardStrength(computerCardOnTable);
        let winnerOfThisTrick;

        if (playerStrength > computerStrength) { winnerOfThisTrick = 'player'; }
        else if (computerStrength > playerStrength) { winnerOfThisTrick = 'computer'; }
        else { winnerOfThisTrick = 'tie'; }
        
        trickWinners[currentTrick - 1] = winnerOfThisTrick;
        if (currentTrick === 1 && winnerOfThisTrick !== 'tie') {
            firstTrickWinner = winnerOfThisTrick;
        }
        
        renderTrickHistory();
        gameMessageEl.textContent = winnerOfThisTrick === 'player' ? 'Você ganhou o turno!' : winnerOfThisTrick === 'computer' ? 'Computador ganhou o turno!' : 'Empatou o turno!';

        // Após avaliar, verifica se a rodada acabou ou continua
        setTimeout(checkForRoundEnd, 2000);
    }

    // VERIFICA SE A RODADA ACABOU
    function checkForRoundEnd() {
        const playerTrickWins = trickWinners.filter(w => w === 'player').length;
        const computerTrickWins = trickWinners.filter(w => w === 'computer').length;

        if (playerTrickWins === 2) { endRound('player'); return; }
        if (computerTrickWins === 2) { endRound('computer'); return; }

        // Regra do empate no 1º turno: quem ganha o 2º, leva.
        if (currentTrick === 2 && trickWinners[0] === 'tie') {
            if (trickWinners[1] !== 'tie') { endRound(trickWinners[1]); return; }
        }
        // Regra do empate no 2º turno: quem ganhou o 1º, leva.
        if (currentTrick === 2 && trickWinners[1] === 'tie' && firstTrickWinner) {
            endRound(firstTrickWinner); return;
        }

        // Se chegou no 3º turno
        if (currentTrick === 3) {
            if (playerTrickWins > computerTrickWins) endRound('player');
            else if (computerTrickWins > playerTrickWins) endRound('computer');
            else endRound(firstTrickWinner || roundStarter); // Se tudo empatar, o "mão" leva.
        } else {
            // Se a rodada continua, prepara o próximo turno
            startNextTrick(trickWinners[currentTrick - 1]);
        }
    }

    // PREPARA O PRÓXIMO TURNO
    function startNextTrick(winner) {
        currentTrick++;
        playerCardOnTable = null;
        computerCardOnTable = null;
        renderPlayedCard(null, playerCardPlayedEl);
        renderPlayedCard(null, computerCardPlayedEl);
        
        trickStarter = winner === 'tie' ? trickStarter : winner;
        isPlayerTurn = (trickStarter === 'player');
        
        renderActionButtons();
        if (isPlayerTurn) {
            gameMessageEl.textContent = `Turno ${currentTrick}: Sua vez!`;
        } else {
            gameMessageEl.textContent = `Turno ${currentTrick}: Vez do computador...`;
            setTimeout(computerPlayCard, 1500);
        }
    }

    // FINALIZA A RODADA E CONTA OS PONTOS
    function endRound(winner) {
        roundInProgress = false;
        if (winner === 'player') { playerScore += roundValue; }
        else if (winner === 'computer') { computerScore += roundValue; }
        
        roundStarter = (roundStarter === 'player') ? 'computer' : 'player'; // Alterna quem começa
        updateScores();
        
        if (playerScore >= 12) { endMatch('player'); }
        else if (computerScore >= 12) { endMatch('computer'); }
        else {
            let winnerText = winner === 'tie' ? 'A rodada empatou!' : `${winner === 'player' ? 'Você' : 'O Computador'} ganhou a rodada!`;
            gameMessageEl.textContent = winnerText;
            renderActionButtons();
        }
    }

    // O restante das funções (endMatch, endSeries, updateScores, resetSeries, startNewMatch) permanecem como antes
    function endMatch(winner) { if (winner === 'player') { playerMatchesWon++; } else { computerMatchesWon++; } updateScores(); if (playerMatchesWon === 2) { endSeries('Você'); } else if (computerMatchesWon === 2) { endSeries('O Computador'); } else { gameInProgress = false; gameMessageEl.textContent = `${winner === 'player' ? 'Você' : 'O Computador'} ganhou a partida!`; renderActionButtons(); } }
    function endSeries(winner) { gameInProgress = false; gameMessageEl.textContent = `FIM DE JOGO! ${winner} VENCEU A SÉRIE!`; renderActionButtons(); }
    function updateScores() { playerScoreEl.textContent = playerScore; computerScoreEl.textContent = computerScore; playerMatchesWonEl.textContent = playerMatchesWon; computerMatchesWonEl.textContent = computerMatchesWon; }
    function resetSeries() { playerMatchesWon = 0; computerMatchesWon = 0; updateScores(); startNewMatch(true); }
    function startNewMatch(isNewSeries = false) { playerScore = 0; computerScore = 0; roundStarter = isNewSeries ? 'player' : roundStarter; gameInProgress = true; startNewRound(); }
    
    function startNewRound() {
        roundInProgress = true; roundValue = 1; trucoState = 'none'; challenger = null;
        createDeck(); playerHand = deck.splice(0, 3); computerHand = deck.splice(0, 3); vira = deck.pop();
        determineManilhas(); 
        currentTrick = 1; firstTrickWinner = null; trickWinners = [];
        trickStarter = roundStarter; isPlayerTurn = (trickStarter === 'player');
        playerCardOnTable = null; computerCardOnTable = null;
        renderPlayedCard(null, playerCardPlayedEl); renderPlayedCard(null, computerCardPlayedEl); renderPlayedCard(vira, viraCardEl);
        renderPlayerHand(); renderComputerHand(); renderTrickHistory();
        updateRoundValueDisplay(); 
        if (isPlayerTurn) { gameMessageEl.textContent = 'Turno 1: Sua vez de jogar!'; }
        else { gameMessageEl.textContent = 'Turno 1: Vez do computador...'; setTimeout(computerPlayCard, 1500); }
        renderActionButtons();
    }
    
    // Lógica de Truco
    function handleTrucoRequest(who) {
        if (!roundInProgress || trucoState !== 'none' || roundValue > 1) return;
        challenger = who; roundValue = 3;
        if (who === 'player') { trucoState = 'pending_computer_response'; gameMessageEl.textContent = 'TRUCO! Aguardando resposta...'; setTimeout(computerRespondToTruco, 1500);
        } else { trucoState = 'pending_player_response'; gameMessageEl.textContent = 'O computador pediu TRUCO!'; }
        renderActionButtons();
    }
    function computerRespondToTruco() {
        const handStrength = Math.max(...computerHand.map(getCardStrength)); const nextBet = roundValue + 3;
        if (handStrength >= 13 && nextBet <= 12) { roundValue = nextBet; challenger = 'computer'; trucoState = 'pending_player_response'; gameMessageEl.textContent = `O computador pediu ${nextBet === 6 ? 'SEIS' : 'NOVE'}!`; renderActionButtons(); }
        else if (handStrength >= 11) { trucoState = 'none'; gameMessageEl.textContent = `O computador ACEITOU!`; updateRoundValueDisplay(); renderActionButtons(); if (challenger === 'player') { isPlayerTurn = true; gameMessageEl.textContent += ' Sua vez!'; } }
        else { const pointsWon = 1; playerScore += pointsWon; gameMessageEl.textContent = `O computador CORREU! Você ganhou ${pointsWon} ponto.`; roundInProgress = false; trucoState = 'none'; updateScores(); if (playerScore >= 12) { endMatch('player'); } else { setTimeout(renderActionButtons, 2000); } }
    }
    function playerRespondToTruco(response) {
        if (response === 'run') { const pointsWon = roundValue === 3 ? 1 : roundValue - 3; computerScore += pointsWon; gameMessageEl.textContent = `Você CORREU! O computador ganhou ${pointsWon} ponto(s).`; roundInProgress = false; trucoState = 'none'; updateScores(); if (computerScore >= 12) { endMatch('computer'); } else { setTimeout(renderActionButtons, 2000); } }
        else if (response === 'accept') { trucoState = 'none'; gameMessageEl.textContent = `Você ACEITOU! A rodada vale ${roundValue} pontos.`; updateRoundValueDisplay(); renderActionButtons(); if (challenger === 'computer') { isPlayerTurn = true; } else { isPlayerTurn = false; setTimeout(computerPlayCard, 1000); } }
        else if (response === 'raise') { const nextBet = roundValue + 3; if (nextBet <= 12) { roundValue = nextBet; challenger = 'player'; trucoState = 'pending_computer_response'; gameMessageEl.textContent = `Você pediu ${nextBet === 6 ? 'SEIS' : 'NOVE'}!`; renderActionButtons(); setTimeout(computerRespondToTruco, 1500); } }
    }
    
    // Renderização dos Botões
    function renderActionButtons() {
        playerActionsEl.innerHTML = '';
        if (!gameInProgress) {
            const nextButton = document.createElement('button');
            nextButton.id = 'new-round-btn';
            if (playerMatchesWon < 2 && computerMatchesWon < 2) { nextButton.textContent = 'Próxima Partida'; nextButton.addEventListener('click', startNewMatch); }
            else { nextButton.textContent = 'Jogar Novamente'; nextButton.addEventListener('click', resetSeries); }
            playerActionsEl.appendChild(nextButton);
            return;
        }
        if (trucoState === 'pending_player_response') {
            const acceptBtn = document.createElement('button'); acceptBtn.textContent = 'Aceitar'; acceptBtn.className = 'action-btn accept-btn'; acceptBtn.addEventListener('click', () => playerRespondToTruco('accept')); playerActionsEl.appendChild(acceptBtn);
            const runBtn = document.createElement('button'); runBtn.textContent = 'Correr'; runBtn.className = 'action-btn run-btn'; runBtn.addEventListener('click', () => playerRespondToTruco('run')); playerActionsEl.appendChild(runBtn);
            if (roundValue < 12) { const raiseBtn = document.createElement('button'); raiseBtn.textContent = `Aumentar para ${roundValue + 3}`; raiseBtn.className = 'action-btn raise-btn'; raiseBtn.addEventListener('click', () => playerRespondToTruco('raise')); playerActionsEl.appendChild(raiseBtn); }
        } else if (roundInProgress) {
            if (trucoState === 'none' && roundValue === 1) {
                const trucoBtnEl = document.createElement('button');
                trucoBtnEl.id = 'truco-btn';
                trucoBtnEl.textContent = 'TRUCO!';
                trucoBtnEl.disabled = !isPlayerTurn;
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
