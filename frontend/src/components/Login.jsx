// Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

const Login = ({ setUser, setToken }) => {
  const [avatar, setAvatar] = React.useState(null);

  React.useEffect(() => {
    const storedAvatar = localStorage.getItem('avatar');
    if (storedAvatar) setAvatar(storedAvatar);
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.avatar) {
        localStorage.setItem('avatar', res.data.user.avatar);
      } else {
        localStorage.removeItem('avatar');
      }
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || (err.message === 'Network Error' ? 'Could not connect to server. Please make sure the backend is running.' : err.message || 'Login failed'));
    }
  };

  return (
    <div className="page-bg login-bg">
      <div className="auth-form">
      <h2>Login to Poker</h2>
      <div className="auth-subtitle">Enter your credentials to join the table</div>
      
      {avatar && (
          <div className="avatar-preview-container" style={{ textAlign: 'center', marginBottom: '15px' }}>
            <img src={avatar} alt="Avatar" className="avatar-preview" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--gold-light)' }} />
          </div>
        )}
        {error && (
        <div style={{ 
          background: 'rgba(231, 76, 60, 0.15)', 
          border: '1.5px solid rgba(231, 76, 60, 0.4)', 
          color: '#e74c3c', 
          padding: '12px', 
          borderRadius: '10px', 
          fontSize: '0.9rem', 
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Access Lobby</button>
      </form>
      
      <div className="auth-footer">
        Don't have an account? <Link to="/signup">Signup</Link>
      </div>
    </div>
    </div>
  );
};

export default Login;
