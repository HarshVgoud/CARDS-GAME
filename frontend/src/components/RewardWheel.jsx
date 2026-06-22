import React, { useState } from 'react';
import axios from 'axios';
import { playSpinTick, playWinFanfare } from '../utils/audio';
import { API_URL } from '../config';
import '../RewardWheel.css';

const RewardWheel = ({ onReward }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');

  const spin = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/spin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSpinning(true);
      const rewardIndex = [50, 100, 200, 500, 1000].indexOf(res.data.reward);
      const targetAngle = 360 - (rewardIndex * 72 + 36);
      const currentRest = rotation % 360;
      const nextFullSpin = rotation - currentRest + 360 * 5; // 5 full spins
      const newRotation = nextFullSpin + targetAngle;
      setRotation(newRotation);

      // Play ticking sound while spinning
      let tickDelay = 50;
      let tickCount = 0;
      const maxTicks = 20;
      const playTickLoop = () => {
        if (tickCount < maxTicks) {
          playSpinTick(tickCount / 4 + 1);
          tickCount++;
          tickDelay = 50 + (tickCount * tickCount * 6); // Slow down intervals
          setTimeout(playTickLoop, tickDelay);
        }
      };
      playTickLoop();

      setTimeout(() => {
        setSpinning(false);
        setMessage(`Congratulations! You won 💰${res.data.reward}!`);
        onReward(res.data.newBalance);
        playWinFanfare();
      }, 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not spin');
    }
  };

  return (
    <div className="reward-wheel-section">
      <div className="wheel-container">
        <div className="wheel-pointer"></div>
        <div 
          className={`wheel ${spinning ? 'spinning' : ''}`} 
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {[50, 100, 200, 500, 1000].map((val, idx) => {
            const angle = idx * 72 + 36;
            return (
              <div 
                key={idx} 
                className="wheel-segment-label" 
                style={{ transform: `rotate(${angle}deg) translateY(-60px)` }}
              >
                💰{val}
              </div>
            );
          })}
        </div>
        <button 
          className={`wheel-center-btn ${spinning ? 'disabled' : ''}`} 
          onClick={!spinning ? spin : undefined}
          disabled={spinning}
        >
          SPIN
        </button>
      </div>
      {message && (
        <div className="wheel-message">
          {message}
        </div>
      )}
    </div>
  );
};

export default RewardWheel;
