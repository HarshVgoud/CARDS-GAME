import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Card from './Card';
import Chips from './Chips';
import WinPercentage from './WinPercentage';
import Confetti from './Confetti';
import { API_URL } from '../config';

import { playCardDeal, playChipClink, playFold, playWinFanfare, playTurnAlert } from '../utils/audio';

let socket;




const Game = ({ user }) => {
  const { roomId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [holeCards, setHoleCards] = useState([]);
  const [raiseValue, setRaiseValue] = useState(0);
  const [actionLogs, setActionLogs] = useState([]);
  const [prevGameState, setPrevGameState] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [activePlayerTimer, setActivePlayerTimer] = useState(30);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  
  const navigate = useNavigate();
  const logsEndRef = useRef(null);

  // Sync WebSocket connection
  useEffect(() => {
    socket = io(API_URL);

    if (user) {
      socket.emit('join_room', { roomId, userId: user.id, username: user.username });
    }

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('hole_cards', (cards) => {
      setHoleCards(cards);
    });

    socket.on('player_reaction', ({ playerId, emoji }) => {
      const reactionId = `${Date.now()}-${Math.random()}`;
      setReactions(prev => [...prev, { id: reactionId, playerId, emoji }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reactionId));
      }, 2000);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user.id, user.username]);

  // Action logger effect
  useEffect(() => {
    if (!gameState) return;

    // Room join initialization
    if (actionLogs.length === 0) {
      setActionLogs([{ id: 'init', msg: `Joined Room: ${roomId}` }]);
    }

    if (prevGameState) {
      // Detect Round Change
      if (prevGameState.round !== gameState.round && gameState.round !== 'waiting') {
        setActionLogs(prev => [
          ...prev,
          { id: `${Date.now()}-round`, msg: `⚡ Round: ${gameState.round.toUpperCase()}` }
        ]);
        playCardDeal();
      }

      // Check community cards count increase
      if (gameState.communityCards.length > prevGameState.communityCards.length) {
        playCardDeal();
      }

      // Check for actions from players
      gameState.players.forEach(p => {
        const prevP = prevGameState.players.find(oldP => oldP.id === p.id);
        if (prevP && p.lastAction && p.lastAction !== prevP.lastAction) {
          let logMsg = `${p.username} ${p.lastAction.toUpperCase()}`;
          if (p.lastAction === 'raise') {
            logMsg += ` to 💰${p.currentBet}`;
            playChipClink();
          } else if (p.lastAction === 'call') {
            logMsg += ` 💰${p.currentBet}`;
            playChipClink();
          } else if (p.lastAction === 'fold') {
            playFold();
          } else if (p.lastAction === 'check') {
            playChipClink();
          }
          setActionLogs(prev => [
            ...prev,
            { id: `${Date.now()}-${p.id}`, msg: logMsg }
          ]);
        }
      });

      // Check for Winner
      if (gameState.winnerInfo && (!prevGameState.winnerInfo || JSON.stringify(prevGameState.winnerInfo) !== JSON.stringify(gameState.winnerInfo))) {
        const winnersText = gameState.winnerInfo.winners.join(', ');
        const winMsg = `🏆 ${winnersText} won 💰${gameState.winnerInfo.amount} (${gameState.winnerInfo.handName})`;
        setActionLogs(prev => [
          ...prev,
          { id: `${Date.now()}-winner`, msg: winMsg }
        ]);
        playWinFanfare();
      }

      // Check if it just became the user's turn
      const wasUserTurn = prevGameState.players.find(pl => pl.id === user.id)?.isTurn;
      const isUserTurnNow = gameState.players.find(pl => pl.id === user.id)?.isTurn;
      if (isUserTurnNow && !wasUserTurn) {
        playTurnAlert();
      }
    } else {
      // First game state loaded, check if user turn
      const isUserTurnNow = gameState.players.find(pl => pl.id === user.id)?.isTurn;
      if (isUserTurnNow) {
        playTurnAlert();
      }
    }

    setPrevGameState(gameState);
  }, [gameState, roomId, user.id]);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actionLogs]);

  // Delayed Winner Celebration Overlay effect
  useEffect(() => {
    if (gameState?.round === 'waiting' && gameState?.winnerInfo) {
      const timer = setTimeout(() => {
        setShowWinnerOverlay(true);
      }, 2200);
      return () => clearTimeout(timer);
    } else {
      setShowWinnerOverlay(false);
    }
  }, [gameState?.round, gameState?.winnerInfo]);

  // Get active player object
  const userPlayer = gameState?.players?.find(p => p.id === user.id);
  const isUserTurn = userPlayer?.isTurn;

  // Calculate raise slider constraints
  const minBet = gameState ? Math.min(userPlayer?.chips + userPlayer?.currentBet, gameState.currentBet + 20) : 0;
  const maxBet = userPlayer ? userPlayer.chips + userPlayer.currentBet : 0;
  const canRaise = userPlayer && userPlayer.chips > (gameState.currentBet - userPlayer.currentBet);

  // Reset raise slider on user turn
  useEffect(() => {
    if (isUserTurn) {
      setRaiseValue(minBet);
    }
  }, [isUserTurn, minBet]);

  // Turn timer countdown effect
  useEffect(() => {
    if (!gameState || !gameState.activePlayerId || gameState.round === 'waiting') return;
    
    // Reset timer to 30 whenever activePlayerId or round changes
    setActivePlayerTimer(30);

    const interval = setInterval(() => {
      setActivePlayerTimer(prev => {
        if (prev <= 1) {
          return 30; // reset local timer
        }
        // Play tick beep warning if 5 seconds left for user
        if (prev <= 6 && gameState.activePlayerId === user.id) {
          playTurnAlert();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.activePlayerId, gameState?.round, user.id]);

  // Preset betting handler
  const setPresetBet = (type) => {
    const bb = gameState.bigBlind || 20;
    const pot = gameState.pot || 0;
    let target = minBet;
    if (type === 'min') target = minBet;
    else if (type === '2bb') target = bb * 2;
    else if (type === '3bb') target = bb * 3;
    else if (type === 'half_pot') target = Math.floor(pot / 2);
    else if (type === 'pot') target = pot;
    else if (type === 'max') target = maxBet;
    
    target = Math.max(minBet, Math.min(maxBet, target));
    setRaiseValue(target);
    playChipClink();
  };

  if (!gameState) {
    return (
      <div className="app-container">
        <h3 style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)', fontWeight: '700' }}>
          Connecting to Table...
        </h3>
      </div>
    );
  }

  const takeAction = (action, amount = 0) => {
    socket.emit('player_action', { roomId, action, amount });
  };

  const startGame = () => {
    socket.emit('start_game', { roomId });
  };

  // Maps index to relative index so user is seated at Bottom Center (Seat 0)
  const getUserSeatIndex = (playerIndex, totalPlayers) => {
    const userIndex = gameState.players.findIndex(p => p.id === user.id);
    const relativeIndex = (playerIndex - userIndex + totalPlayers) % totalPlayers;

    if (totalPlayers === 2) return relativeIndex === 0 ? 0 : 4;
    if (totalPlayers === 3) return [0, 2, 6][relativeIndex];
    if (totalPlayers === 4) return [0, 2, 4, 6][relativeIndex];
    if (totalPlayers === 5) return [0, 1, 3, 4, 6][relativeIndex];
    if (totalPlayers === 6) return [0, 1, 2, 4, 5, 6][relativeIndex];
    if (totalPlayers === 7) return [0, 1, 2, 3, 4, 5, 6][relativeIndex];
    return relativeIndex; // 8 players
  };

  const getDealerStatusText = () => {
    if (!gameState) return '';
    if (gameState.round === 'waiting') {
      if (gameState.winnerInfo) {
        return `Winner: ${gameState.winnerInfo.winners.join(', ')}`;
      }
      return 'Waiting for next hand...';
    }
    
    const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
    if (activePlayer) {
      return `Waiting for ${activePlayer.username} to act...`;
    }
    
    return 'Dealing cards...';
  };

  return (
    <div className="game-screen">
      {/* Logs Overlay Panel */}
      <div className="action-log-panel">
        <div className="action-log-title">Table Logs</div>
        <div className="action-log-messages">
          {actionLogs.map((log) => (
            <div key={log.id} className="log-msg">
              {log.msg.startsWith('🏆') || log.msg.startsWith('⚡') ? (
                <span className="highlight" style={{ color: log.msg.startsWith('🏆') ? 'var(--gold-light)' : 'var(--royal-blue)' }}>
                  {log.msg}
                </span>
              ) : (
                <span>{log.msg}</span>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* 3D Felt Poker Table */}
      <div className="poker-table-container">
        <div className="poker-table">
          <div className="table-watermark">Hold'em</div>

          {/* Dealer Croupier Section */}
          <div className="dealer-croupier-container">
            <div className={`dealer-croupier-avatar-wrapper ${gameState.round !== 'waiting' ? 'shuffling' : ''}`}>
              <img 
                src={gameState.currentDealer === 0 ? '/dealer1.png' : '/dealer2.png'} 
                alt="Dealer" 
                className="dealer-croupier-avatar" 
              />
            </div>
            <div className="dealer-croupier-info">
              <span className="dealer-croupier-name">
                {gameState.currentDealer === 0 ? 'Dealer Parv' : 'Dealer Vedant'}
              </span>
              <span className="dealer-croupier-status">
                {getDealerStatusText()}
              </span>
            </div>
          </div>
          
          <div className="pot-display" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 24px', height: 'auto', borderRadius: '24px', minWidth: '150px', alignItems: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pot</div>
            <Chips amount={gameState.pot} />
          </div>

          {/* Flying chips to winner(s) */}
          {gameState.round === 'waiting' && gameState.winnerInfo && (
            <div className="flying-chips-container">
              {gameState.players.map((p, pIdx) => {
                if (gameState.winnerInfo.winners.includes(p.username)) {
                  const seatIndex = getUserSeatIndex(pIdx, gameState.players.length);
                  return Array.from({ length: 8 }).map((_, chipIdx) => (
                    <div
                      key={`${p.id}-chip-${chipIdx}`}
                      className={`flying-chip chip-gold seat-dest-${seatIndex}`}
                      style={{
                        animationDelay: `${chipIdx * 0.08}s`,
                      }}
                    >
                      <div className="chip-inner">
                        <span className="chip-label">💰</span>
                      </div>
                    </div>
                  ));
                }
                return null;
              })}
            </div>
          )}

          {/* Community Cards */}
          <div className="community-cards">
            {gameState.communityCards.map((card, i) => (
              <Card key={i} cardStr={card} />
            ))}
            {[...Array(5 - gameState.communityCards.length)].map((_, i) => (
              <div key={i + 5} className="card-placeholder">?</div>
            ))}
          </div>

          {/* Player Seats */}
          {gameState.players.map((p, i) => {
            const seatIndex = getUserSeatIndex(i, gameState.players.length);
            const isDealer = gameState.activePlayerId !== undefined && i === (gameState.players.findIndex(pl => pl.id === p.id) - 1 + gameState.players.length) % gameState.players.length; // Approximate dealer placement logic
            const actualIsDealer = i === 0; // Or bind with dealerIndex if it exists
            
            return (
              <div 
                key={i} 
                className={`player-seat seat-${seatIndex}`}
              >
                <div className={`player-info ${p.isTurn ? 'active-turn' : ''} ${p.folded ? 'folded' : ''}`}>
                  
                  {/* Floating reactions */}
                  {reactions
                    .filter(r => r.playerId === p.id)
                    .map(r => (
                      <div key={r.id} className="floating-reaction">
                        {r.emoji}
                      </div>
                    ))}

                  {/* Timer ring */}
                  {p.isTurn && (
                    <svg className="player-timer-ring">
                      <circle
                        className="player-timer-circle"
                        r="22"
                        cx="24"
                        cy="24"
                        strokeDasharray={2 * Math.PI * 22}
                        strokeDashoffset={2 * Math.PI * 22 - (activePlayerTimer / 30) * (2 * Math.PI * 22)}
                      />
                    </svg>
                  )}

                  {/* Dealer Button token placement */}
                  {i === gameState.dealerIndex && (
                    <div className="dealer-button" title="Dealer Button">D</div>
                  )}

                  {/* Actions State Pill Badges */}
                  {p.lastAction && (
                    <div className={`action-badge ${p.lastAction.toLowerCase()} ${p.isAllIn ? 'all-in' : ''}`}>
                      {p.lastAction}
                    </div>
                  )}

                  <div className="player-avatar">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      p.username.slice(0, 2)
                    )}
                  </div>
                  
                  <div className="player-name">
                    {p.username} {p.id === user.id && "(You)"}
                  </div>
                  
                  <div className="player-chips">
                    💰{p.chips}
                  </div>
                  {p.gamesPlayed > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)', marginTop: '2px', fontWeight: '600' }}>
                      🏆 {((p.wins / p.gamesPlayed) * 100).toFixed(0)}% WR
                    </div>
                  )}

                  {/* 3D Chip Stack visualization for current bet */}
                  <Chips amount={p.currentBet} />

                  {/* Hole Cards Container */}
                  <div className="seat-cards-container">
                    {p.id === user.id ? (
                      // Current user card visibility
                      holeCards.map((c, j) => (
                        <Card key={j} cardStr={c} />
                      ))
                    ) : (
                      // Opponent cards: hidden normally, face up at showdown / waiting pause
                      !p.folded && (
                        p.holeCards && p.holeCards.length > 0 ? (
                          p.holeCards.map((c, j) => (
                            <Card key={j} cardStr={c} />
                          ))
                        ) : (
                          gameState.round !== 'waiting' && (
                            <>
                              <Card faceDown />
                              <Card faceDown />
                            </>
                          )
                        )
                      )
                    )}
                  </div>

                  {/* Win chance display for self */}
                  {p.id === user.id && gameState.round !== 'waiting' && gameState.round !== 'showdown' && (
                    <div style={{ marginTop: '8px' }}>
                      <WinPercentage winRate={gameState.myWinChance || 0} label="Win Chance" mini />
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Showdown Winner Celebration Overlay */}
      {showWinnerOverlay && gameState.round === 'waiting' && gameState.winnerInfo && (
        <>
          <Confetti />
          <div className="winner-overlay">
            <div className="winner-card">
              <div className="winner-crown">👑</div>
              <div className="winner-title">
                {gameState.winnerInfo.winners.join(' & ')} Wins!
              </div>
              <div className="winner-amount">
                💰{gameState.winnerInfo.amount} chips
              </div>
              <div className="winner-hand">
                {gameState.winnerInfo.handName.toUpperCase()}
              </div>
              
              {gameState.winnerInfo.cards && gameState.winnerInfo.cards.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '1px' }}>
                    Winning Combination
                  </div>
                  <div className="winner-cards-show">
                    {gameState.winnerInfo.cards.map((c, idx) => (
                      <Card key={idx} cardStr={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom Panel Actions Controls */}
      <div className="game-controls">
        {/* Sliders for Bet sizing with Preset Shortcuts */}
        {isUserTurn && maxBet > minBet && (
          <div className="raise-slider-container" style={{ flexDirection: 'column', gap: '8px' }}>
            <div className="bet-presets">
              <button type="button" className="btn-preset" onClick={() => setPresetBet('min')}>Min</button>
              {maxBet >= (gameState.bigBlind || 20) * 2 && <button type="button" className="btn-preset" onClick={() => setPresetBet('2bb')}>2x BB</button>}
              {maxBet >= (gameState.bigBlind || 20) * 3 && <button type="button" className="btn-preset" onClick={() => setPresetBet('3bb')}>3x BB</button>}
              {gameState.pot > 0 && maxBet >= Math.floor(gameState.pot / 2) && <button type="button" className="btn-preset" onClick={() => setPresetBet('half_pot')}>1/2 Pot</button>}
              {gameState.pot > 0 && maxBet >= gameState.pot && <button type="button" className="btn-preset" onClick={() => setPresetBet('pot')}>Pot</button>}
              <button type="button" className="btn-preset" onClick={() => setPresetBet('max')}>All-In</button>
            </div>
            
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }}>
              <div className="raise-slider-label">Raise: 💰{raiseValue}</div>
              <input 
                type="range" 
                className="raise-slider"
                min={minBet} 
                max={maxBet} 
                step={10}
                value={raiseValue} 
                onChange={(e) => setRaiseValue(Number(e.target.value))}
              />
              <div className="raise-val-display">💰{maxBet} (Max)</div>
            </div>
          </div>
        )}

        <div className="controls-row" style={{ position: 'relative' }}>
          {gameState.round === 'waiting' && !gameState.winnerInfo ? (
            <button 
              className="btn-action btn-call" 
              onClick={startGame} 
              disabled={gameState.players.length < 2}
            >
              {gameState.players.length < 2 ? 'Waiting for players...' : 'Start New Hand'}
            </button>
          ) : (
            <>
              <button 
                className="btn-action btn-fold" 
                onClick={() => takeAction('fold')} 
                disabled={!isUserTurn}
              >
                Fold
              </button>
              
              <button 
                className="btn-action btn-call" 
                onClick={() => takeAction('call')} 
                disabled={!isUserTurn}
              >
                {gameState.currentBet > (userPlayer?.currentBet || 0) ? 'Call' : 'Check'}
              </button>
              
              <button 
                className="btn-action btn-raise" 
                onClick={() => takeAction('raise', raiseValue)} 
                disabled={!isUserTurn || !canRaise}
              >
                {raiseValue === maxBet ? 'All-In' : `Raise to ${raiseValue}`}
              </button>
            </>
          )}
          
          <button 
            className="btn-action btn-exit" 
            onClick={() => navigate('/lobby')}
          >
            Leave Room
          </button>

          {/* Emoji Reaction Selector */}
          <div className="emoji-picker-container">
            <button 
              type="button"
              className="emoji-picker-btn" 
              onClick={() => setShowEmojiPanel(!showEmojiPanel)}
              title="Send Reaction"
            >
              😊
            </button>
            {showEmojiPanel && (
              <div className="emoji-panel">
                {['👍', '😂', '🔥', '😮', '😡', '💩', '💸'].map(emoji => (
                  <span 
                    key={emoji} 
                    className="emoji-option" 
                    onClick={() => {
                      socket.emit('send_reaction', { roomId, emoji });
                      setShowEmojiPanel(false);
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
