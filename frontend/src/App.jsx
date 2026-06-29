import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token && !user) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  }, [token, user]);

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const isLoggedIn = !!(token && user);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!isLoggedIn ? <Login setUser={setUser} setToken={setToken} /> : <Navigate to="/lobby" />} />
          <Route path="/signup" element={!isLoggedIn ? <Signup /> : <Navigate to="/lobby" />} />
          <Route path="/lobby" element={isLoggedIn ? <Lobby user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/game/:roomId" element={isLoggedIn ? <Game user={user} /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/lobby" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
