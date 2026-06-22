import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!token ? <Login setUser={setUser} setToken={setToken} /> : <Navigate to="/lobby" />} />
          <Route path="/signup" element={!token ? <Signup /> : <Navigate to="/lobby" />} />
          <Route path="/lobby" element={token ? <Lobby user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/game/:roomId" element={token ? <Game user={user} /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/lobby" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
