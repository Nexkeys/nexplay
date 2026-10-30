/** Small synthesized sound effects, so there are no audio files to download. */
export type Sfx = 'tap' | 'drop' | 'seed' | 'card' | 'deal' | 'win' | 'lose' | 'error' | 'tick' | 'turn' | 'capture' | 'correct' | 'wrong';

let ctx: AudioContext | null = null;
const KEY = 'np-muted';

export const isMuted = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
export const setMuted = (m: boolean) => {
  try {
    localStorage.setItem(KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
};

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slide = 0) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, c.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.02);
}

function noise(at: number, dur: number, gain = 0.08, freq = 1800) {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + at);
}

export function play(s: Sfx) {
  if (typeof window === 'undefined' || isMuted()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    switch (s) {
      case 'tap':
        tone(520, 0, 0.06, 'triangle', 0.06);
        break;
      case 'seed':
        tone(900 + Math.random() * 300, 0, 0.05, 'sine', 0.05, 0.6);
        noise(0, 0.03, 0.03, 3000);
        break;
      case 'drop':
        tone(220, 0, 0.16, 'sine', 0.16, 0.5);
        noise(0.02, 0.06, 0.05, 900);
        break;
      case 'card':
        noise(0, 0.08, 0.1, 2400);
        break;
      case 'deal':
        for (let i = 0; i < 4; i++) noise(i * 0.06, 0.06, 0.07, 2600);
        break;
      case 'capture':
        tone(660, 0, 0.1, 'triangle', 0.08);
        tone(990, 0.08, 0.14, 'triangle', 0.08);
        break;
      case 'turn':
        tone(740, 0, 0.12, 'sine', 0.06);
        tone(988, 0.1, 0.16, 'sine', 0.06);
        break;
      case 'correct':
        tone(784, 0, 0.1, 'triangle', 0.08);
        tone(1175, 0.09, 0.18, 'triangle', 0.08);
        break;
      case 'wrong':
      case 'error':
        tone(200, 0, 0.18, 'sawtooth', 0.05, 0.7);
        break;
      case 'tick':
        tone(1400, 0, 0.03, 'square', 0.03);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28, 'triangle', 0.09));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.3, 'sine', 0.08));
        break;
    }
  } catch {
    /* audio not available */
  }
}

export const buzz = (ms: number | number[] = 12) => {
  try {
    if (!isMuted()) navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
};
