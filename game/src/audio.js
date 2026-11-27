// Sound, generated with WebAudio: no audio files, no network. Every call is
// a no-op until the player has pressed a key or clicked (browsers only let
// audio start after a gesture), and a failure to make sound never breaks play.

export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freqFrom, freqTo, seconds, type, gain) {
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') {
      if (ctx) ctx.resume().catch(() => {});
      if (!ctx || ctx.state === 'suspended') return;
    }
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), ctx.currentTime + seconds);
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + seconds);
    } catch {
      // Sound is garnish; never let it break the game.
    }
  }

  return {
    jump() {
      tone(280, 620, 0.14, 'square', 0.05);
    },
    pickup() {
      tone(880, 1320, 0.1, 'sine', 0.06);
    },
    hit() {
      tone(180, 60, 0.25, 'sawtooth', 0.09);
    },
    caught() {
      tone(400, 90, 0.6, 'sawtooth', 0.08);
    },
    win() {
      tone(523, 523, 0.12, 'sine', 0.07);
      setTimeout(() => tone(659, 659, 0.12, 'sine', 0.07), 120);
      setTimeout(() => tone(784, 784, 0.22, 'sine', 0.07), 240);
    },
  };
}
