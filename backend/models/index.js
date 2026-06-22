const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const storagePath = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION
  ? '/tmp/database.sqlite'
  : path.join(__dirname, '../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 1000
  },
  wins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  gamesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastSpinTime: {
    type: DataTypes.DATE,
    defaultValue: new Date(0) // Default to long ago so they can spin immediately
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

const GameHistory = sequelize.define('GameHistory', {
  roomId: DataTypes.STRING,
  winner: DataTypes.STRING,
  pot: DataTypes.INTEGER,
  players: DataTypes.TEXT // JSON string of players
});

module.exports = { sequelize, User, GameHistory };
