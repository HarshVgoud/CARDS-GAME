// src/config.js
export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : (typeof window !== 'undefined' ? window.location.origin + '/_/backend' : ''));
