/**
 * Ludo King Authentic Audio Sound Engine
 * Loads studio-quality Ludo King audio assets (dice roll, coin move, coin cut, coin goal)
 * with sample-accurate Web Audio API buffering, zero latency, and procedural fallback.
 */

let audioCtx = null;
let isMuted = false;

// In-memory decoded AudioBuffer cache
const soundBuffers = {
  diceRoll: null,
  coinMove: null,
  coinCut: null,
  coinGoal: null,
};

export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Asynchronously pre-load and decode WAV files into memory for zero-latency playback
const loadSoundBuffer = async (name, url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const arrayBuffer = await response.arrayBuffer();
    const ctx = getAudioContext();
    if (ctx) {
      ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => {
          soundBuffers[name] = decoded;
        },
        () => {}
      );
    }
  } catch (_) {}
};

// Initialize buffer loading when module loads
if (typeof window !== 'undefined') {
  const initBuffers = () => {
    getAudioContext();
    loadSoundBuffer('diceRoll', '/sounds/dice_roll.wav');
    loadSoundBuffer('coinMove', '/sounds/coin_move.wav');
    loadSoundBuffer('coinCut', '/sounds/coin_cut.wav');
    loadSoundBuffer('coinGoal', '/sounds/coin_goal.wav');
  };

  // Try immediate load
  initBuffers();

  // Also auto-unlock AudioContext and load on first user touch/click
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    if (!soundBuffers.diceRoll) {
      initBuffers();
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export const toggleLudoAudioMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

export const isLudoAudioMuted = () => isMuted;

export const setLudoAudioMuted = (muted) => {
  isMuted = Boolean(muted);
};

// Helper: Play decoded buffer with volume and optional pitch/playbackRate scaling
const playCachedBuffer = (buffer, options = {}) => {
  const ctx = getAudioContext();
  if (!ctx || !buffer) return false;
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    if (options.playbackRate) {
      source.playbackRate.setValueAtTime(options.playbackRate, ctx.currentTime);
    }

    const gainNode = ctx.createGain();
    const vol = options.volume !== undefined ? options.volume : 0.85;
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * 1. LUDO KING DICE ROLL (Cup Shake Rattle & Tumbling Clatter)
 * Played once when user or bot rolls the dice.
 */
export const playDiceShakeSound = () => {
  if (isMuted) return;
  try {
    // 1. Try playing studio Ludo King dice roll WAV buffer
    if (soundBuffers.diceRoll) {
      playCachedBuffer(soundBuffers.diceRoll, { volume: 0.9 });
      return;
    }

    // 2. High-precision procedural fallback
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rattle cup shake sequence (4 rapid micro-strikes)
    const impactTimes = [0.0, 0.05, 0.11, 0.17, 0.24, 0.31];
    impactTimes.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + idx * 80 + Math.random() * 200, now + offset);
      filter.Q.setValueAtTime(3.5, now + offset);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260 + Math.random() * 140, now + offset);

      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.045);
    });
  } catch (_) {}
};

/**
 * 1b. LUDO KING DICE LAND (Solid wooden board settle & Lucky Six chime)
 * Played when the final roll number is shown.
 */
export const playDiceLandSound = (finalRoll = 1) => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Board impact thump
    const oscThump = ctx.createOscillator();
    const gainThump = ctx.createGain();
    oscThump.type = 'sine';
    oscThump.frequency.setValueAtTime(140, now);
    oscThump.frequency.exponentialRampToValueAtTime(45, now + 0.09);
    gainThump.gain.setValueAtTime(0.24, now);
    gainThump.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscThump.connect(gainThump);
    gainThump.connect(ctx.destination);
    oscThump.start(now);
    oscThump.stop(now + 0.11);

    // Surface clack
    const oscClack = ctx.createOscillator();
    const gainClack = ctx.createGain();
    oscClack.type = 'triangle';
    oscClack.frequency.setValueAtTime(840, now);
    oscClack.frequency.exponentialRampToValueAtTime(240, now + 0.06);
    gainClack.gain.setValueAtTime(0.18, now);
    gainClack.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    oscClack.connect(gainClack);
    gainClack.connect(ctx.destination);
    oscClack.start(now);
    oscClack.stop(now + 0.08);

    // If 6 rolled: Ludo King lucky ding chime!
    if (finalRoll === 6) {
      setTimeout(() => {
        playLuckySixChime();
      }, 60);
    }
  } catch (_) {}
};

/**
 * Lucky Six Chime (Sparkling celebratory bell)
 */
export const playLuckySixChime = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [659.25, 1046.5]; // E5 -> C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  } catch (_) {}
};

/**
 * 2. LUDO KING COIN MOVE / PAWN STEP (Crisp wooden block / marble pop tap)
 * Plays the signature "tok... tok... tok..." on every single tile traversed.
 */
export const playCoinStepSound = (stepIndex = 0) => {
  if (isMuted) return;
  try {
    // 1. Try playing studio Ludo King coin move WAV buffer with ascending pitch per step
    if (soundBuffers.coinMove) {
      const pitchRatio = 1.0 + (stepIndex % 8) * 0.035; // 780Hz -> 960Hz melodic climb
      playCachedBuffer(soundBuffers.coinMove, { playbackRate: pitchRatio, volume: 0.95 });
      return;
    }

    // 2. High-precision procedural fallback
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const baseFreq = 760 + (stepIndex % 8) * 28;

    // Body resonance (wooden block)
    const oscBody = ctx.createOscillator();
    const gainBody = ctx.createGain();
    oscBody.type = 'sine';
    oscBody.frequency.setValueAtTime(baseFreq, now);
    oscBody.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.05);

    gainBody.gain.setValueAtTime(0.22, now);
    gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    oscBody.connect(gainBody);
    gainBody.connect(ctx.destination);
    oscBody.start(now);
    oscBody.stop(now + 0.06);

    // Initial click transient (wood strike)
    const oscClick = ctx.createOscillator();
    const gainClick = ctx.createGain();
    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(baseFreq * 2.2, now);
    oscClick.frequency.exponentialRampToValueAtTime(300, now + 0.015);

    gainClick.gain.setValueAtTime(0.18, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    oscClick.connect(gainClick);
    gainClick.connect(ctx.destination);
    oscClick.start(now);
    oscClick.stop(now + 0.02);
  } catch (_) {}
};

/**
 * 2b. COIN EXIT BASE (Unlock leap when entering track from home base on 6)
 */
export const playCoinExitBaseSound = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Upward pitch spring sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch (_) {}
};

/**
 * 3. COIN CUT / KNOCKOUT (Heavy collision strike punch + reverse whoosh)
 */
export const playCoinCutSound = () => {
  if (isMuted) return;
  try {
    if (soundBuffers.coinCut) {
      playCachedBuffer(soundBuffers.coinCut, { volume: 0.95 });
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy knockout impact punch
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(260, now);
    oscBass.frequency.exponentialRampToValueAtTime(45, now + 0.26);

    gainBass.gain.setValueAtTime(0.3, now);
    gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    oscBass.start(now);
    oscBass.stop(now + 0.32);
  } catch (_) {}
};

/**
 * 4. COIN REACH GOAL (Celebratory harmonic ascension when pawn enters home triangle)
 */
export const playCoinReachGoalSound = () => {
  if (isMuted) return;
  try {
    if (soundBuffers.coinGoal) {
      playCachedBuffer(soundBuffers.coinGoal, { volume: 0.95 });
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic arpeggio: C5 -> E5 -> G5 -> C6
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const noteTime = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.48);
    });
  } catch (_) {}
};

/**
 * 5. WINNER FANFARE (Triumphant grand victory fanfare for match winner)
 */
export const playWinnerFanfareSound = (isLocalWinner = true) => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (isLocalWinner) {
      const melody = [
        { f: 523.25, d: 0.14, t: 0.0 },    // C5
        { f: 659.25, d: 0.14, t: 0.14 },   // E5
        { f: 783.99, d: 0.14, t: 0.28 },   // G5
        { f: 1046.5, d: 0.45, t: 0.42 },   // C6
        { f: 880.0,  d: 0.14, t: 0.90 },   // A5
        { f: 1046.5, d: 0.14, t: 1.04 },   // C6
        { f: 1318.5, d: 0.75, t: 1.18 },   // E6
      ];

      melody.forEach(({ f, d, t }) => {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(f * 0.5, now + t);

        gain.gain.setValueAtTime(0.22, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
        osc2.start(now + t);
        osc2.stop(now + t + d + 0.05);
      });
    } else {
      const notes = [440, 392, 349.23, 261.63];
      notes.forEach((f, idx) => {
        const t = now + idx * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
  } catch (_) {}
};

/**
 * 6. YOUR TURN ALERT (Polite dual chime)
 */
export const playYourTurnAlertSound = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [587.33, 880.0]; // D5 -> A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.1, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.26);
    });
  } catch (_) {}
};
