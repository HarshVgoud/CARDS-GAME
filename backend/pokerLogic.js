const Hand = require('pokersolver').Hand;

class PokerGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = []; // { id, socketId, username, chips, holeCards, folded, currentBet, isAllIn, lastAction, hasActed }
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.activePlayerIndex = 0;
    this.round = 'waiting'; // waiting, pre-flop, flop, turn, river, showdown
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.winnerInfo = null;
    this.handCount = 0;
  }

  createDeck() {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    for (let s of suits) {
      for (let v of values) {
        this.deck.push(v + s);
      }
    }
    this.shuffle();
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  addPlayer(id, socketId, username, chips, avatar, wins, gamesPlayed) {
    const existingPlayer = this.players.find(p => p.id === id);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.chips = chips;
      existingPlayer.avatar = avatar;
      existingPlayer.wins = wins;
      existingPlayer.gamesPlayed = gamesPlayed;
      existingPlayer.disconnected = false;
      return;
    }
    this.players.push({
      id,
      socketId,
      username,
      chips,
      holeCards: [],
      folded: false,
      currentBet: 0,
      isAllIn: false,
      lastAction: '',
      hasActed: false,
      avatar,
      wins,
      gamesPlayed,
      disconnected: false
    });
  }

  removePlayer(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player) return null;
    
    if (this.round === 'waiting') {
      this.players = this.players.filter(p => p.socketId !== socketId);
      return { action: 'removed', player };
    } else {
      player.disconnected = true;
      player.folded = true;
      return { action: 'flagged', player };
    }
  }

  startNewHand() {
    this.players = this.players.filter(p => !p.disconnected);
    if (this.players.length < 2) return;
    this.winnerInfo = null;
    this.createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.round = 'pre-flop';
    this.handCount++;
    this.players.forEach(p => {
      p.holeCards = [this.deck.pop(), this.deck.pop()];
      p.folded = false;
      p.currentBet = 0;
      p.isAllIn = false;
      p.lastAction = '';
      p.hasActed = false;
    });
    
    this.dealerIndex = this.dealerIndex % this.players.length;

    const sbIndex = (this.dealerIndex + 1) % this.players.length;
    const bbIndex = (this.dealerIndex + 2) % this.players.length;
    
    this.bet(this.players[sbIndex], this.smallBlind);
    this.bet(this.players[bbIndex], this.bigBlind);
    
    this.currentBet = Math.max(this.players[sbIndex].currentBet, this.players[bbIndex].currentBet);
    
    let actIndex = (this.dealerIndex + 3) % this.players.length;
    let loopCount = 0;
    while ((this.players[actIndex].folded || this.players[actIndex].isAllIn) && loopCount < this.players.length) {
      actIndex = (actIndex + 1) % this.players.length;
      loopCount++;
    }
    this.activePlayerIndex = actIndex;

    this.checkShowdownOrRunOut();
  }

  bet(player, amount) {
    const actualBet = Math.min(player.chips, amount);
    player.chips -= actualBet;
    player.currentBet += actualBet;
    this.pot += actualBet;
    if (player.chips === 0) player.isAllIn = true;
    return actualBet;
  }

  handleAction(socketId, action, amount = 0) {
    const player = this.players[this.activePlayerIndex];
    if (!player || player.socketId !== socketId) return false;

    // Validate actions
    if (action === 'check') {
      if (player.currentBet !== this.currentBet) {
        return false;
      }
    } else if (action === 'call') {
      if (player.currentBet >= this.currentBet) {
        return false;
      }
    } else if (action === 'raise') {
      const minRaise = this.currentBet + this.bigBlind;
      const maxRaise = player.chips + player.currentBet;
      const allowedMin = Math.min(minRaise, maxRaise);
      if (amount < allowedMin || amount > maxRaise) {
        return false;
      }
    }

    player.lastAction = action;
    player.hasActed = true;

    if (action === 'fold') {
      player.folded = true;
    } else if (action === 'call') {
      const callAmount = this.currentBet - player.currentBet;
      this.bet(player, callAmount);
    } else if (action === 'raise') {
      const raiseAmount = amount - player.currentBet;
      this.bet(player, raiseAmount);
      this.currentBet = Math.max(this.currentBet, player.currentBet);
      
      // Reset hasActed for all other active, non-all-in players
      this.players.forEach(p => {
        if (p.id !== player.id && !p.folded && !p.isAllIn) {
          p.hasActed = false;
        }
      });
    }

    if (this.checkShowdownOrRunOut()) {
      return true;
    }

    const activePlayers = this.players.filter(p => !p.folded);
    const isRoundComplete = activePlayers.every(p => p.isAllIn || (p.hasActed && p.currentBet === this.currentBet));

    if (isRoundComplete) {
      this.nextRound();
    } else {
      this.moveToNextPlayer();
    }
    return true;
  }

  checkShowdownOrRunOut() {
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.endHand(activePlayers[0]);
      return true;
    }
    const playersWhoCanAct = this.players.filter(p => !p.folded && !p.isAllIn);
    if (playersWhoCanAct.length <= 1) {
      this.runOutCards();
      return true;
    }
    return false;
  }

  runOutCards() {
    while (this.round !== 'showdown' && this.round !== 'waiting') {
      if (this.round === 'pre-flop') {
        this.round = 'flop';
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      } else if (this.round === 'flop') {
        this.round = 'turn';
        this.communityCards.push(this.deck.pop());
      } else if (this.round === 'turn') {
        this.round = 'river';
        this.communityCards.push(this.deck.pop());
      } else if (this.round === 'river') {
        this.round = 'showdown';
        this.evaluateWinner();
        break;
      }
    }
  }

  moveToNextPlayer() {
    let nextIndex = (this.activePlayerIndex + 1) % this.players.length;
    let loopCount = 0;
    while ((this.players[nextIndex].folded || this.players[nextIndex].isAllIn) && loopCount < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      loopCount++;
    }
    this.activePlayerIndex = nextIndex;
  }

  nextRound() {
    if (this.round === 'pre-flop') {
      this.round = 'flop';
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    } else if (this.round === 'flop') {
      this.round = 'turn';
      this.communityCards.push(this.deck.pop());
    } else if (this.round === 'turn') {
      this.round = 'river';
      this.communityCards.push(this.deck.pop());
    } else if (this.round === 'river') {
      this.round = 'showdown';
      this.evaluateWinner();
      return;
    }
    
    this.players.forEach(p => {
      p.currentBet = 0;
      p.hasActed = false;
      p.lastAction = '';
    });
    this.currentBet = 0;

    if (this.checkShowdownOrRunOut()) {
      return;
    }

    let nextIndex = (this.dealerIndex + 1) % this.players.length;
    let loopCount = 0;
    while ((this.players[nextIndex].folded || this.players[nextIndex].isAllIn) && loopCount < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      loopCount++;
    }
    this.activePlayerIndex = nextIndex;
  }

  evaluateWinner() {
    const activePlayers = this.players.filter(p => !p.folded);
    const hands = activePlayers.map(p => {
      const solved = Hand.solve([...p.holeCards, ...this.communityCards]);
      return { player: p, solved };
    });
    
    const winners = Hand.winners(hands.map(h => h.solved));
    const winningPlayers = hands.filter(h => winners.includes(h.solved)).map(h => h.player);
    
    const winAmount = Math.floor(this.pot / winningPlayers.length);
    const remainder = this.pot % winningPlayers.length;
    winningPlayers.forEach((p, idx) => {
      p.chips += winAmount + (idx < remainder ? 1 : 0);
    });

    this.winnerInfo = {
      winners: winningPlayers.map(p => p.username),
      amount: this.pot,
      handName: winners[0].descr,
      cards: winners[0].cards.map(c => c.value + c.suit)
    };
    
    this.endHand();
  }

  endHand(singleWinner = null) {
    if (singleWinner) {
      singleWinner.chips += this.pot;
      this.winnerInfo = {
        winners: [singleWinner.username],
        amount: this.pot,
        handName: 'everyone else folded',
        cards: []
      };
    }
    this.round = 'waiting';
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.pot = 0;
  }

  calculateWinChances() {
    const activePlayers = this.players.filter(p => !p.folded && p.holeCards && p.holeCards.length === 2);
    const winChances = {};
    
    // Initialize winChances to 0 for all players
    this.players.forEach(p => {
      winChances[p.id] = 0;
    });

    if (activePlayers.length < 2 || this.round === 'waiting' || this.round === 'showdown') {
      if (activePlayers.length === 1) {
        winChances[activePlayers[0].id] = 100;
      }
      return winChances;
    }

    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const fullDeck = [];
    for (let s of suits) {
      for (let v of values) {
        fullDeck.push(v + s);
      }
    }

    const trials = 100;

    activePlayers.forEach(p => {
      const knownCards = new Set([...p.holeCards, ...this.communityCards]);
      const availableCards = fullDeck.filter(card => !knownCards.has(card));
      const otherActivePlayers = activePlayers.filter(op => op.id !== p.id);
      const cardsNeeded = 5 - this.communityCards.length;
      
      let playerWins = 0;

      for (let t = 0; t < trials; t++) {
        // Copy and shuffle availableCards using Fisher-Yates
        const tempDeck = [...availableCards];
        for (let i = tempDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tempDeck[i], tempDeck[j]] = [tempDeck[j], tempDeck[i]];
        }

        // Deal 2 random hole cards to each of the other active players
        const trialOpponentHoles = [];
        for (let i = 0; i < otherActivePlayers.length; i++) {
          trialOpponentHoles.push([tempDeck.pop(), tempDeck.pop()]);
        }

        // Deal remaining community cards to complete the 5 cards
        const trialCommunity = [...this.communityCards];
        for (let i = 0; i < cardsNeeded; i++) {
          trialCommunity.push(tempDeck.pop());
        }

        // Solve all hands for comparison
        const trialHands = [];
        // The main player we are evaluating
        trialHands.push({
          playerId: p.id,
          solved: Hand.solve([...p.holeCards, ...trialCommunity])
        });
        // The other active players with their simulated cards
        otherActivePlayers.forEach((op, idx) => {
          trialHands.push({
            playerId: op.id,
            solved: Hand.solve([...trialOpponentHoles[idx], ...trialCommunity])
          });
        });

        // Determine winner(s)
        const winners = Hand.winners(trialHands.map(h => h.solved));
        const winningHands = trialHands.filter(h => winners.includes(h.solved));
        
        // If our main player is among the winners, increment the wins/splits count
        const isWinner = winningHands.some(h => h.playerId === p.id);
        if (isWinner) {
          playerWins += 1 / winningHands.length;
        }
      }

      winChances[p.id] = Math.round((playerWins / trials) * 100);
    });

    return winChances;
  }

  getState() {
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        chips: p.chips,
        folded: p.folded,
        isAllIn: p.isAllIn,
        currentBet: p.currentBet,
        lastAction: p.lastAction,
        isTurn: this.players[this.activePlayerIndex] && this.players[this.activePlayerIndex].id === p.id && this.round !== 'waiting',
        holeCards: (this.round === 'showdown' || this.round === 'waiting') ? p.holeCards : [],
        avatar: p.avatar,
        wins: p.wins,
        gamesPlayed: p.gamesPlayed,
        disconnected: p.disconnected
      })),
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      round: this.round,
      activePlayerId: this.players[this.activePlayerIndex]?.id,
      winnerInfo: this.winnerInfo,
      currentDealer: this.handCount % 2,
      dealerIndex: this.dealerIndex
    };
  }
}

module.exports = PokerGame;
