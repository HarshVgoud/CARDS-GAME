// src/components/Chips.jsx
import React from 'react';

const breakDownChips = (amount) => {
  const denominations = [
    { value: 1000, color: 'gold', label: '1K' },
    { value: 500, color: 'black', label: '500' },
    { value: 100, color: 'green', label: '100' },
    { value: 50, color: 'blue', label: '50' },
    { value: 10, color: 'red', label: '10' },
  ];

  let remainder = amount;
  const stack = [];

  for (let denom of denominations) {
    const count = Math.floor(remainder / denom.value);
    if (count > 0) {
      // Limit to max 4 chips per denomination to avoid massive towers
      const toAdd = Math.min(count, 4);
      for (let i = 0; i < toAdd; i++) {
        stack.push(denom);
      }
      remainder = remainder % denom.value;
    }
  }

  // Fallback to at least one chip if amount is positive but too small
  if (amount > 0 && stack.length === 0) {
    stack.push({ value: 10, color: 'red', label: '10' });
  }

  // Reverse so largest chips are at the bottom of the stack
  return stack.reverse().slice(0, 8); // maximum 8 chips stacked
};

const Chips = ({ amount }) => {
  if (!amount || amount <= 0) return null;

  const chips = breakDownChips(amount);

  return (
    <div className="chip-stack-wrapper">
      <div className="chip-stack">
        {chips.map((chip, index) => (
          <div 
            key={index} 
            className={`poker-chip chip-${chip.color}`} 
            style={{ 
              zIndex: index,
              transform: `translateY(-${index * 4}px) rotateX(25deg)`,
            }}
          >
            <div className="chip-inner">
              <span className="chip-label">{chip.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="chip-total">💰{amount}</div>
    </div>
  );
};

export default Chips;
