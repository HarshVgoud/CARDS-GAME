// Signup.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';


const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarData, setAvatarData] = useState(null);
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setAvatar(preview);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/signup`, { username, password, avatar: avatarData });
      setMessage('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage(err.response?.data?.error || (err.message === 'Network Error' ? 'Could not connect to server. Please make sure the backend is running.' : err.message || 'Signup failed'));
    }
  };

  return (
    <div className="page-bg signup-bg">
      <div className="auth-form">
        <h2>Join Poker Club</h2>
        <div className="auth-subtitle">Create a free account to receive 1,000 starting chips</div>
        
        {message && (
          <div style={{ 
            background: message.includes('created') ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)', 
            border: message.includes('created') ? '1.5px solid rgba(46, 204, 113, 0.4)' : '1.5px solid rgba(231, 76, 60, 0.4)', 
            color: message.includes('created') ? '#2ecc71' : '#e74c3c', 
            padding: '12px', 
            borderRadius: '10px', 
            fontSize: '0.9rem', 
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {message.includes('created') ? '🎉' : '⚠️'} {message}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <input 
            type="text" 
            placeholder="Choose Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Choose Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <div className="avatar-upload">
            <label htmlFor="avatarInput" className="avatar-label">Upload Avatar</label>
            <input id="avatarInput" type="file" accept="image/*" onChange={handleAvatarChange} />
            {avatar && <img src={avatar} alt="Avatar Preview" className="avatar-preview" />}
          </div>
          <button type="submit">Create Account</button>
        </form>
        
        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
