require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User } = require('./models');
const PokerGame = require('./pokerLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, avatar } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, avatar });
    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Server error during registration: " + error.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, coins: user.coins, avatar: user.avatar } });
});

app.get('/api/user', authenticateToken, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  res.json({ username: user.username, coins: user.coins, wins: user.wins, gamesPlayed: user.gamesPlayed, lastSpinTime: user.lastSpinTime, avatar: user.avatar });
});

app.post('/api/spin', authenticateToken, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const now = new Date();
  const lastSpin = new Date(user.lastSpinTime);
  const diffHours = (now - lastSpin) / (1000 * 60 * 60);

  if (diffHours < 12) {
    const remaining = Math.ceil(12 - diffHours);
    return res.status(400).json({ error: `Next spin available in ${remaining} hours` });
  }

  const rewards = [50, 100, 200, 500, 1000];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  
  user.coins += reward;
  user.lastSpinTime = now;
  await user.save();

  res.json({ reward, newBalance: user.coins });
});

// Poker Game Rooms
const rooms = new Map();
const roomTimeouts = new Map();

const emitGameState = (roomId, game) => {
  const winChances = game.calculateWinChances();
  
  game.players.forEach(p => {
    if (p.socketId && !p.disconnected) {
      const playerSpecificState = {
        ...game.getState(),
        myWinChance: winChances[p.id] || 0
      };
      io.to(p.socketId).emit('game_state', playerSpecificState);
    }
  });
};

const startTurnTimeout = (roomId) => {
  if (roomTimeouts.has(roomId)) {
    clearTimeout(roomTimeouts.get(roomId));
  }
  
  const timer = setTimeout(() => {
    const game = rooms.get(roomId);
    if (game && game.round !== 'waiting') {
      const activePlayer = game.players[game.activePlayerIndex];
      if (activePlayer) {
        console.log(`Auto-folding player ${activePlayer.username} due to timeout`);
        const canCheck = game.currentBet === activePlayer.currentBet;
        const action = canCheck ? 'check' : 'fold';
        
        if (game.handleAction(activePlayer.socketId, action, 0)) {
          emitGameState(roomId, game);
          
          if (game.round === 'waiting') {
            handleHandEnd(roomId, game);
          } else {
            startTurnTimeout(roomId);
          }
        }
      }
    }
  }, 30000); // 30 seconds
  
  roomTimeouts.set(roomId, timer);
};

const clearTurnTimeout = (roomId) => {
  if (roomTimeouts.has(roomId)) {
    clearTimeout(roomTimeouts.get(roomId));
    roomTimeouts.delete(roomId);
  }
};

const handleHandEnd = (roomId, game) => {
  clearTurnTimeout(roomId);
  
  // Save player stats in DB
  for (const p of game.players) {
    User.findByPk(p.id).then(dbUser => {
      if (dbUser) {
        dbUser.coins = p.chips;
        dbUser.gamesPlayed += 1;
        if (game.winnerInfo && game.winnerInfo.winners.includes(p.username)) {
          dbUser.wins += 1;
        }
        return dbUser.save();
      }
    }).catch(err => {
      console.error(`Failed to update stats for player ${p.username}:`, err);
    });
  }

  // Clean up disconnected players
  game.players = game.players.filter(p => !p.disconnected);

  // Transition to next hand in 5 seconds
  setTimeout(() => {
    if (game.players.length < 2) {
      game.winnerInfo = null;
      emitGameState(roomId, game);
      return;
    }
    
    // Refill players with low chips
    game.players.forEach(p => {
      if (p.chips < game.bigBlind) {
        p.chips = 1000;
        User.findByPk(p.id).then(dbUser => {
          if (dbUser) {
            dbUser.coins = 1000;
            return dbUser.save();
          }
        }).catch(err => {
          console.error(`Failed to refill chips for player ${p.username}:`, err);
        });
      }
    });

    game.startNewHand();
    emitGameState(roomId, game);
    game.players.forEach(p => {
      io.to(p.socketId).emit('hole_cards', p.holeCards);
    });
    
    if (game.round !== 'waiting') {
      startTurnTimeout(roomId);
    }
  }, 5000);
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', async ({ roomId, userId, username }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new PokerGame(roomId));
    }
    
    const game = rooms.get(roomId);
    const user = await User.findByPk(userId);
    game.addPlayer(userId, socket.id, username, user.coins, user.avatar, user.wins, user.gamesPlayed);
    
    emitGameState(roomId, game);
  });

  socket.on('start_game', ({ roomId }) => {
    const game = rooms.get(roomId);
    if (game) {
      // Refill players with low chips
      game.players.forEach(p => {
        if (p.chips < game.bigBlind) {
          p.chips = 1000;
          User.findByPk(p.id).then(dbUser => {
            if (dbUser) {
              dbUser.coins = 1000;
              return dbUser.save();
            }
          }).catch(err => {
            console.error(`Failed to refill chips for player ${p.username}:`, err);
          });
        }
      });

      game.startNewHand();
      emitGameState(roomId, game);
      // Send hole cards privately
      game.players.forEach(p => {
        io.to(p.socketId).emit('hole_cards', p.holeCards);
      });
      
      if (game.round !== 'waiting') {
        startTurnTimeout(roomId);
      }
    }
  });

  socket.on('player_action', ({ roomId, action, amount }) => {
    const game = rooms.get(roomId);
    if (game && game.handleAction(socket.id, action, amount)) {
      emitGameState(roomId, game);
      
      if (game.round === 'waiting') {
        handleHandEnd(roomId, game);
      } else {
        startTurnTimeout(roomId);
      }
    }
  });
  
  socket.on('send_reaction', ({ roomId, emoji }) => {
    const game = rooms.get(roomId);
    if (game) {
      const player = game.players.find(p => p.socketId === socket.id);
      if (player) {
        io.to(roomId).emit('player_reaction', { playerId: player.id, emoji });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find rooms containing the disconnected socket and auto-action if it's their turn
    for (const [roomId, game] of rooms.entries()) {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const player = game.players[playerIndex];
        
        // Save chips immediately on disconnect
        User.findByPk(player.id).then(dbUser => {
          if (dbUser) {
            dbUser.coins = player.chips;
            return dbUser.save();
          }
        }).catch(err => {
          console.error(`Failed to update chips on disconnect for ${player.username}:`, err);
        });

        const result = game.removePlayer(socket.id);
        
        if (result) {
          if (game.round !== 'waiting') {
            if (game.activePlayerIndex === playerIndex) {
              console.log(`Auto-folding active disconnected player ${player.username}`);
              const canCheck = game.currentBet === player.currentBet;
              const action = canCheck ? 'check' : 'fold';
              if (game.handleAction(socket.id, action, 0)) {
                emitGameState(roomId, game);
                if (game.round === 'waiting') {
                  handleHandEnd(roomId, game);
                } else {
                  startTurnTimeout(roomId);
                }
              }
            } else {
              // Check if hand ends as a result of disconnect folding
              if (game.checkShowdownOrRunOut()) {
                emitGameState(roomId, game);
                handleHandEnd(roomId, game);
              } else {
                emitGameState(roomId, game);
              }
            }
          } else {
            if (game.players.length < 2) {
              game.winnerInfo = null;
            }
            emitGameState(roomId, game);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: true }).then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
