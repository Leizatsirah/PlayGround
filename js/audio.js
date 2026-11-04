// Tiny procedural chip-tune soundtrack and sound effects. No audio files.
let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let muted = false;
let musicTimer = null;
let step = 0;
let track = null;

const TRACKS = {
  farm: {
    bpm: 84,
    base: 261.63,
    melody: [0, 4, 7, 12, 7, 4, 2, 4, 0, 4, 7, 14, 12, 7, 4, 2],
    bass: [0, 0, -5, -5, -3, -3, -7, -7],
    wave: 'triangle',
  },
  town: {
    bpm: 96,
    base: 293.66,
    melody: [0, 4, 7, 11, 12, 11, 7, 4, 2, 4, 7, 9, 11, 9, 7, 4],
    bass: [0, 0, 5, 5, -2, -2, 3, 3],
    wave: 'square',
  },
  forest: {
    bpm: 72,
    base: 220.0,
    melody: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 10, 7, 3, 0],
    bass: [0, 0, -5, -5, 2, 2, -3, -3],
    wave: 'triangle',
  },
  beach: {
    bpm: 88,
    base: 246.94,
    melody: [0, 7, 4, 9, 12, 9, 4, 7, 0, 7, 4, 11, 9, 7, 4, 2],
    bass: [0, 0, 4, 4, -3, -3, 2, 2],
    wave: 'triangle',
  },
  river: {
    bpm: 76,
    base: 233.08,
    melody: [0, 2, 7, 9, 12, 9, 7, 2, 0, 2, 7, 11, 9, 7, 2, 0],
    bass: [0, 0, -3, -3, 2, 2, -5, -5],
    wave: 'sine',
  },
};

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.09;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.22;
  sfxGain.connect(master);
  return true;
}

function freq(base, semis) { return base * Math.pow(2, semis / 12); }

function tone(f, dur, type, gainNode, when, vol = 0.5, attack = 0.01) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(gainNode);
  o.start(when); o.stop(when + dur + 0.02);
}

function scheduleBar() {
  if (!ctx || !track) return;
  const data = TRACKS[track] || TRACKS.farm;
  const beat = 60 / data.bpm / 2;
  const now = ctx.currentTime + 0.05;
  const len = data.melody.length;
  for (let i = 0; i < len; i++) {
    const n = data.melody[(step + i) % len];
    const t = now + i * beat;
    if (n !== null) {
      tone(freq(data.base, n), beat * 1.6, data.wave, musicGain, t, i % 4 === 0 ? 0.55 : 0.34, 0.02);
      if (i % 4 === 0) tone(freq(data.base, n + 12), beat * 0.7, 'sine', musicGain, t, 0.18);
    }
    if (i % 2 === 0) {
      const b = data.bass[(step / 2 + i / 2) % data.bass.length];
      tone(freq(data.base / 2, b), beat * 2.1, 'triangle', musicGain, t, 0.45, 0.03);
    }
    if (i % 4 === 2) {
      tone(180, 0.03, 'square', musicGain, t, 0.08);
    }
  }
  step += len;
  musicTimer = setTimeout(scheduleBar, beat * len * 1000);
}

export function startMusic(name) {
  if (muted) { track = name; return; }
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (track === name && musicTimer) return;
  track = name;
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  step = 0;
  scheduleBar();
}

export function stopMusic() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  track = null;
}

export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem('willow-muted', muted ? '1' : '0'); } catch {}
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (!muted && ctx) startMusic(track || 'farm');
}

export function isMuted() { return muted; }
export function initMuted() {
  try { muted = localStorage.getItem('willow-muted') === '1'; } catch {}
  return muted;
}

export function unlockAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

const SFX = {
  click: () => { tone(620, 0.05, 'square', sfxGain, ctx.currentTime, 0.4); },
  open: () => { tone(440, 0.08, 'triangle', sfxGain, ctx.currentTime, 0.5); tone(660, 0.1, 'triangle', sfxGain, ctx.currentTime + 0.06, 0.4); },
  close: () => { tone(440, 0.06, 'triangle', sfxGain, ctx.currentTime, 0.35); },
  talk: () => { tone(520, 0.05, 'square', sfxGain, ctx.currentTime, 0.25); tone(680, 0.06, 'square', sfxGain, ctx.currentTime + 0.05, 0.2); },
  plant: () => { tone(330, 0.07, 'triangle', sfxGain, ctx.currentTime, 0.5); tone(440, 0.09, 'triangle', sfxGain, ctx.currentTime + 0.07, 0.4); },
  water: () => { for (let i = 0; i < 4; i++) tone(900 + i * 120, 0.08, 'sine', sfxGain, ctx.currentTime + i * 0.04, 0.18); },
  chop: () => { tone(150, 0.1, 'square', sfxGain, ctx.currentTime, 0.5); tone(90, 0.12, 'triangle', sfxGain, ctx.currentTime + 0.05, 0.4); },
  harvest: () => { tone(520, 0.07, 'triangle', sfxGain, ctx.currentTime, 0.5); tone(780, 0.1, 'triangle', sfxGain, ctx.currentTime + 0.07, 0.45); tone(1040, 0.12, 'sine', sfxGain, ctx.currentTime + 0.14, 0.3); },
  coin: () => { tone(880, 0.06, 'square', sfxGain, ctx.currentTime, 0.4); tone(1320, 0.1, 'square', sfxGain, ctx.currentTime + 0.06, 0.32); },
  error: () => { tone(160, 0.12, 'sawtooth', sfxGain, ctx.currentTime, 0.26); tone(120, 0.14, 'sawtooth', sfxGain, ctx.currentTime + 0.08, 0.22); },
  sleep: () => { [330, 392, 440, 523, 392, 330].forEach((f, i) => tone(f, 0.35, 'sine', sfxGain, ctx.currentTime + i * 0.16, 0.3)); },
  catch: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', sfxGain, ctx.currentTime + i * 0.07, 0.32)); },
  splash: () => { for (let i = 0; i < 5; i++) tone(700 - i * 90, 0.09, 'sine', sfxGain, ctx.currentTime + i * 0.035, 0.2); },
  step: () => { tone(110, 0.03, 'triangle', sfxGain, ctx.currentTime, 0.12); },
};

export function sfx(name) {
  if (muted) return;
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const fn = SFX[name];
  if (fn) { try { fn(); } catch {} }
}
