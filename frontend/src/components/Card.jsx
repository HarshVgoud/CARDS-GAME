// src/components/Card.jsx
import React, { useState, useEffect } from 'react';

/**
 * Card component renders a poker card with 3D flip support.
 * Props:
 *   - cardStr: string like "Ah" (rank + suit) where rank can be A,2-9,T,J,Q,K and suit h/d/c/s.
 *   - faceDown: boolean to show the back of the card.
 */
const Card = ({ cardStr, faceDown = false }) => {
  const [isFlipped, setIsFlipped] = useState(true);

  useEffect(() => {
    if (!faceDown && cardStr) {
      // Trigger a state change to flip the card face-up after mounting
      const timer = setTimeout(() => {
        setIsFlipped(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(true);
    }
  }, [faceDown, cardStr]);

  if (!cardStr && !faceDown) return <div className="card-placeholder">?</div>;

  const suitSymbols = {
    h: '♥',
    d: '♦',
    c: '♣',
    s: '♠',
  };
  const rank = cardStr ? cardStr.slice(0, -1) : '';
  const suit = cardStr ? cardStr.slice(-1) : '';
  const isRed = ['h', 'd'].includes(suit);
  const suitSymbol = suitSymbols[suit] || suit;

  // Format T to 10 for standard playing card feel
  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div className={`card-container ${isFlipped ? 'is-flipped' : ''}`}>
      <div className="card-inner-flip">
        {/* Front Face */}
        <div className={`card-face front poker-card ${isRed ? 'red' : 'black'}`}>
          <div className="card-top-left">
            <span className="card-rank">{displayRank}</span>
            <span className="card-suit-mini">{suitSymbol}</span>
          </div>
          <div className="card-center-suit">{suitSymbol}</div>
          <div className="card-bottom-right">
            <span className="card-rank">{displayRank}</span>
            <span className="card-suit-mini">{suitSymbol}</span>
          </div>
        </div>

        {/* Back Face */}
        <div className="card-face back poker-card-back">
          <div className="poker-card-back-logo">♠</div>
        </div>
      </div>
    </div>
  );
};

export default Card;
