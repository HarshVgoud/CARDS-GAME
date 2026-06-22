// src/utils/audio.js

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Play a short organic card dealing sound (hiss/slide)
export const playCardDeal = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create noise buffer for paper scrape
    const bufferSize = ctx.sampleRate * 0.12; // 120ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter noise to sound like paper
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Play metallic poker chip clinks
export const playChipClink = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Chips make double clinks usually
    const playSingleClink = (delay) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // High frequency bells
      osc1.frequency.setValueAtTime(2800, now + delay);
      osc2.frequency.setValueAtTime(3400, now + delay);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now + delay);
      osc2.start(now + delay);
      
      osc1.stop(now + delay + 0.1);
      osc2.stop(now + delay + 0.1);
    };
    
    playSingleClink(0);
    playSingleClink(0.04); // Double bounce
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Play soft card fold/slide sound
export const playFold = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Play victory fan fare (arpeggio)
export const playWinFanfare = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.15;
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = now + idx * 0.12;
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Play turn alert notification
export const playTurnAlert = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Gentle chime
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Play spinning wheel sound effect
export const playSpinTick = (speedFactor = 1) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    
    gain.gain.setValueAtTime(0.06 / speedFactor, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};
