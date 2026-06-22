import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RewardWheel from './RewardWheel';
import WinPercentage from './WinPercentage';
import { API_URL } from '../config';

const Lobby = ({ user, logout }) => {
  const [roomId, setRoomId] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        logout();
      }
    };
    fetchStats();
  }, []);

  const joinRoom = () => {
    if (roomId) navigate(`/game/${roomId}`);
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PKR-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(code);
  };

  return (
    <div className="page-bg lobby-bg">
      <div className="auth-form" style={{ maxWidth: '520px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        {stats?.avatar ? (
          <img src={stats.avatar} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--gold-light)', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#0b0914' }}>
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ margin: 0, textAlign: 'left', lineHeight: '1.2' }}>Welcome, {user.username}!</h2>
          <div className="auth-subtitle" style={{ margin: 0, textAlign: 'left', fontSize: '0.85rem' }}>Access stats, spin rewards, or join a room</div>
        </div>
      </div>
      
      {stats && (
        <div style={{ marginBottom: '25px' }}>
          <div className="stats-container">
            <div className="stat-item" style={{ gridColumn: 'span 2', background: 'rgba(241, 196, 15, 0.05)', borderColor: 'rgba(241, 196, 15, 0.2)' }}>
              <div className="stat-val" style={{ color: 'var(--gold-light)', fontSize: '2.2rem', textShadow: '0 0 10px rgba(241, 196, 15, 0.3)' }}>
                💰{stats.coins}
              </div>
              <div className="stat-lbl" style={{ color: 'var(--gold-light)' }}>Chip Balance</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">🏆 {stats.wins}</div>
              <div className="stat-lbl">Hands Won</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">🃏 {stats.gamesPlayed}</div>
              <div className="stat-lbl">Played</div>
            </div>
            <div className="stat-item" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
              <WinPercentage winRate={stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(0) : 0} />
            </div>
          </div>
        </div>
      )}

      <RewardWheel onReward={(newBalance) => setStats({ ...stats, coins: newBalance })} />

      <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '25px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Room ID (e.g. FRIENDS)" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)}
            style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2.4px', textTransform: 'uppercase', margin: 0, flexGrow: 1 }}
          />
          <button 
            type="button" 
            onClick={generateRoomCode}
            style={{ 
              width: 'auto', 
              padding: '0 20px', 
              margin: 0, 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--gold-light)',
              boxShadow: 'none',
              fontSize: '0.9rem',
              fontWeight: '700'
            }}
          >
            🎲 Generate
          </button>
        </div>
        
        <button onClick={joinRoom} style={{ background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.25)' }}>
          Enter Poker Room
        </button>
        <button onClick={logout} className="btn-exit" style={{ marginTop: '12px', padding: '12px' }}>
          Sign Out
        </button>
      </div>
    </div>
    </div>
  );
};

export default Lobby;
