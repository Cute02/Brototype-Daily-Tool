import confetti from 'canvas-confetti';

export function triggerConfettiBurst(x, y) {
  try {
    const originX = x ? x / window.innerWidth : 0.5;
    const originY = y ? y / window.innerHeight : 0.5;

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { x: originX, y: originY },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']
    });
  } catch (e) {
    console.log("Confetti burst triggered");
  }
}

export function playChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.log("Audio play blocked");
  }
}
