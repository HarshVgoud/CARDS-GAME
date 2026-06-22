// src/components/WinPercentage.jsx
// Displays the player's win percentage as a premium badge.
// Accepts a numeric winRate (0‑100) and renders a circular SVG progress indicator.

import React from 'react';

const WinPercentage = ({ winRate, label = "Win Rate", mini = false }) => {
  const pct = Math.max(0, Math.min(100, Number(winRate)));
  const dashOffset = 100 - pct; // For SVG circle dasharray

  if (mini) {
    return (
      <div className="win-percentage mini" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(253, 203, 110, 0.2)' }}>
        <svg viewBox="0 0 36 36" className="circular-chart" style={{ width: '22px', height: '22px', margin: 0 }}>
          <path
            className="circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <path
            className="circle"
            strokeDasharray="100, 100"
            strokeDashoffset={dashOffset}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
            fill="none"
            stroke="var(--gold-light)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text x="18" y="22" className="percentage-text" textAnchor="middle" style={{ fill: '#fff', fontSize: '0.65rem', fontWeight: 'bold' }}>
            {pct}%
          </text>
        </svg>
        <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
    );
  }

  return (
    <div className="win-percentage">
      <svg viewBox="0 0 36 36" className="circular-chart">
        <path
          className="circle-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <path
          className="circle"
          strokeDasharray="100, 100"
          strokeDashoffset={dashOffset}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
          fill="none"
          stroke="var(--gold-light)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text x="18" y="20.35" className="percentage-text" textAnchor="middle">
          {pct}%
        </text>
      </svg>
      <div className="win-label">{label}</div>
    </div>
  );
};

export default WinPercentage;
