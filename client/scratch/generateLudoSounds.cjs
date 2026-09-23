const fs = require('fs');
const path = require('path');

function createWavBuffer(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1.0 .. +1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intSample), offset);
    offset += 2;
  }

  return buffer;
}

const sampleRate = 44100;

// 1. GENERATE LUDO KING COIN MOVE (Crisp wooden block / marble pop tap)
// Duration ~65ms
function generateCoinMove() {
  const duration = 0.065;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  const f0 = 780; // Wood block fundamental
  const f1 = 1716; // Overblown 2nd harmonic
  const f2 = 2964; // High transient snap

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Fast attack envelope (< 1ms), followed by exponential decay
    const attack = Math.min(1, t / 0.0008);
    const bodyDecay = Math.exp(-t / 0.022);
    const harmonicDecay = Math.exp(-t / 0.007);
    const snapDecay = Math.exp(-t / 0.0025);

    // Initial click/tap transient
    const noise = (Math.random() * 2 - 1) * snapDecay * 0.35;
    const snap = Math.sin(2 * Math.PI * f2 * t) * snapDecay * 0.45;

    // Resonant wooden body
    const body = Math.sin(2 * Math.PI * f0 * t) * bodyDecay * 0.75;
    const harmonic = Math.sin(2 * Math.PI * f1 * t) * harmonicDecay * 0.35;

    samples[i] = attack * (body + harmonic + snap + noise);
  }

  return createWavBuffer(samples, sampleRate);
}

// 2. GENERATE LUDO KING DICE ROLL (Cup rattle & tumbling settling double-bounce)
// Duration ~520ms
function generateDiceRoll() {
  const duration = 0.52;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  // Shaking impacts inside cup
  const cupImpacts = [
    { t: 0.02, amp: 0.45, f: 540, hf: 2200 },
    { t: 0.06, amp: 0.60, f: 510, hf: 1950 },
    { t: 0.11, amp: 0.50, f: 580, hf: 2400 },
    { t: 0.16, amp: 0.65, f: 530, hf: 2100 },
    { t: 0.21, amp: 0.55, f: 560, hf: 2300 },
    { t: 0.26, amp: 0.70, f: 520, hf: 2000 },
    { t: 0.31, amp: 0.60, f: 550, hf: 2250 },
  ];

  // Final board bounces
  const boardStrikes = [
    { t: 0.37, amp: 0.90, fLow: 130, fHigh: 860, decayLow: 0.045, decayHigh: 0.025 },
    { t: 0.43, amp: 0.50, fLow: 180, fHigh: 1100, decayLow: 0.025, decayHigh: 0.015 },
    { t: 0.47, amp: 0.25, fLow: 240, fHigh: 1350, decayLow: 0.015, decayHigh: 0.010 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    // Cup shake rattle
    for (const imp of cupImpacts) {
      if (t >= imp.t) {
        const dt = t - imp.t;
        if (dt < 0.04) {
          const env = Math.exp(-dt / 0.009);
          const noise = (Math.random() * 2 - 1) * Math.exp(-dt / 0.003) * 0.3;
          const tone = Math.sin(2 * Math.PI * imp.f * dt) * 0.5;
          const hfTone = Math.sin(2 * Math.PI * imp.hf * dt) * 0.4;
          s += (tone + hfTone + noise) * env * imp.amp;
        }
      }
    }

    // Board impacts
    for (const b of boardStrikes) {
      if (t >= b.t) {
        const dt = t - b.t;
        if (dt < 0.08) {
          const envLow = Math.exp(-dt / b.decayLow);
          const envHigh = Math.exp(-dt / b.decayHigh);
          const snap = (Math.random() * 2 - 1) * Math.exp(-dt / 0.002) * 0.35;
          const low = Math.sin(2 * Math.PI * b.fLow * dt) * envLow * 0.6;
          const high = Math.sin(2 * Math.PI * b.fHigh * dt) * envHigh * 0.5;
          s += (low + high + snap) * b.amp;
        }
      }
    }

    samples[i] = s;
  }

  return createWavBuffer(samples, sampleRate);
}

// 3. GENERATE LUDO KNOCKOUT CAPTURE SOUND (Heavy strike punch + whoosh)
function generateCoinCut() {
  const duration = 0.35;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Punch sweep from 260Hz down to 50Hz
    const freq = 260 * Math.exp(-t / 0.08) + 50;
    const punchEnv = Math.exp(-t / 0.09);
    const punch = Math.sin(2 * Math.PI * freq * t) * punchEnv * 0.7;

    // High friction smash click
    const snapEnv = Math.exp(-t / 0.006);
    const snap = (Math.random() * 2 - 1) * snapEnv * 0.6;

    // Whoosh tail
    let whoosh = 0;
    if (t > 0.08) {
      const wt = t - 0.08;
      const wEnv = Math.exp(-wt / 0.12) * Math.sin(Math.min(Math.PI, wt * 15));
      const wFreq = 900 - wt * 2500;
      whoosh = Math.sin(2 * Math.PI * Math.max(120, wFreq) * wt) * wEnv * 0.35;
    }

    samples[i] = punch + snap + whoosh;
  }

  return createWavBuffer(samples, sampleRate);
}

// 4. GENERATE LUDO COIN REACH HOME GOAL CHORD (C5 -> E5 -> G5 -> C6 chime)
function generateCoinGoal() {
  const duration = 0.65;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  const notes = [
    { t: 0.00, f: 523.25 }, // C5
    { t: 0.08, f: 659.25 }, // E5
    { t: 0.16, f: 783.99 }, // G5
    { t: 0.24, f: 1046.50 }, // C6
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    for (const note of notes) {
      if (t >= note.t) {
        const dt = t - note.t;
        const env = Math.exp(-dt / 0.18);
        const fundamental = Math.sin(2 * Math.PI * note.f * dt) * 0.45;
        const harmonic = Math.sin(2 * Math.PI * (note.f * 2) * dt) * 0.18 * Math.exp(-dt / 0.09);
        s += (fundamental + harmonic) * env;
      }
    }

    samples[i] = s;
  }

  return createWavBuffer(samples, sampleRate);
}

// Save all sounds to client/public/sounds
const targetDir = path.resolve(__dirname, '../public/sounds');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(path.join(targetDir, 'dice_roll.wav'), generateDiceRoll());
fs.writeFileSync(path.join(targetDir, 'coin_move.wav'), generateCoinMove());
fs.writeFileSync(path.join(targetDir, 'coin_cut.wav'), generateCoinCut());
fs.writeFileSync(path.join(targetDir, 'coin_goal.wav'), generateCoinGoal());

console.log('Successfully generated authentic Ludo King audio WAV files in:', targetDir);
