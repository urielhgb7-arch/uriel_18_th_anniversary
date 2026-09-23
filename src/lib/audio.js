/**
 * Moteur audio 100% procédural (Web Audio API).
 *
 * Pourquoi pas de mp3 : aucun asset à héberger, aucune requête réseau, aucun
 * 404, et le son part exactement à la frame voulue. Critique ici, parce que
 * toute l'illusion de l'appel repose sur une sonnerie qui démarre pile au bon
 * moment, même en 3G.
 *
 * Contrainte navigateur : un AudioContext naît "suspended" jusqu'au premier
 * geste utilisateur. `unlockAudio()` est appelé au tap du lock screen — ce geste
 * fait donc légitimement démarrer la sonnerie juste après.
 */

const STORE_KEY = 'nexus_muted';

let ctx = null;
let master = null;
let unlocked = false;
let muted = false;
const voices = new Map(); // sons persistants : sonnerie, drone d'ambiance

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  return ctx;
}

/** Lit la préférence son. Par défaut : son ACTIF (rien ne joue avant le tap). */
export function initAudioPreference() {
  try {
    muted = localStorage.getItem(STORE_KEY) === 'true';
  } catch {
    muted = false;
  }
  return muted;
}

export function isMuted() {
  return muted;
}

export async function unlockAudio() {
  const c = context();
  if (!c) return false;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  unlocked = true;
  return true;
}

export function setMuted(next) {
  muted = next;
  try {
    localStorage.setItem(STORE_KEY, String(next));
  } catch {
    /* mode privé : on ignore, l'état reste en mémoire */
  }
  if (master && ctx) {
    // Rampe courte : un mute instantané produit un clic audible.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
  }
}

/** True si on peut réellement produire du son maintenant. */
function live() {
  return unlocked && ctx && master;
}

// ── Primitives ───────────────────────────────────────────────────────────────

let noiseBuffer = null;
function noise() {
  if (noiseBuffer) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/**
 * Note percussive avec enveloppe exponentielle.
 * @returns {number} instant de fin, pour chaîner des séquences.
 */
function tone({ freq, dur = 0.4, type = 'sine', gain = 0.25, at = 0, attack = 0.005, detune = 0 }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const vca = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;
  vca.gain.setValueAtTime(0.0001, t0);
  vca.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  vca.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(vca).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  return t0 + dur;
}

/** Timbre marimba : fondamentale sinus + harmonique courte pour le "bois". */
function marimba(freq, at, gain = 0.3) {
  tone({ freq, dur: 0.75, type: 'sine', gain, at });
  tone({ freq: freq * 2.01, dur: 0.18, type: 'sine', gain: gain * 0.3, at });
}

// ── Sonnerie ─────────────────────────────────────────────────────────────────

/** Motif arpégé montant, dans l'esprit des sonneries iOS modernes. */
const RING_PATTERN = [0, 0.19, 0.38, 0.57, 0.9, 1.09, 1.28];
const RING_NOTES = [587.33, 880, 1174.66, 880, 587.33, 880, 1174.66]; // D5 A5 D6 …
const RING_CYCLE = 3.2;

export function startRingtone() {
  if (!live() || voices.has('ring')) return;
  const cycle = () => {
    if (!live()) return;
    RING_PATTERN.forEach((at, i) => marimba(RING_NOTES[i], at, 0.26));
  };
  cycle();
  const id = setInterval(cycle, RING_CYCLE * 1000);
  voices.set('ring', () => clearInterval(id));
}

export function stopRingtone() {
  const stop = voices.get('ring');
  if (stop) {
    stop();
    voices.delete('ring');
  }
}

// ── Effets cinématiques ──────────────────────────────────────────────────────

/** Braam inversé : montée en tension pendant la chute quantique. */
export function playDive(duration = 2.2) {
  if (!live()) return;
  const t0 = ctx.currentTime;

  // Nappe de scies qui glisse vers l'aigu.
  [55, 82.5, 110].forEach((base, i) => {
    const osc = ctx.createOscillator();
    const vca = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, t0);
    lp.frequency.exponentialRampToValueAtTime(3600, t0 + duration);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 5, t0 + duration);
    osc.detune.value = i * 7;
    vca.gain.setValueAtTime(0.0001, t0);
    vca.gain.exponentialRampToValueAtTime(0.16, t0 + duration * 0.8);
    vca.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(lp).connect(vca).connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  });

  // Souffle d'aspiration par-dessus.
  const src = ctx.createBufferSource();
  const bp = ctx.createBiquadFilter();
  const vca = ctx.createGain();
  src.buffer = noise();
  src.loop = true;
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t0);
  bp.frequency.exponentialRampToValueAtTime(5000, t0 + duration);
  vca.gain.setValueAtTime(0.0001, t0);
  vca.gain.exponentialRampToValueAtTime(0.2, t0 + duration * 0.85);
  vca.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bp).connect(vca).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

/** Braam grave classique : impact dramatique (gantelet, révélations). */
export function playBraam(duration = 3.4) {
  if (!live()) return;
  const t0 = ctx.currentTime;
  [36.7, 55, 73.4, 110].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const vca = ctx.createGain();
    osc.type = i < 2 ? 'sawtooth' : 'triangle';
    osc.frequency.value = f;
    osc.detune.value = (i % 2 ? 1 : -1) * 9;
    vca.gain.setValueAtTime(0.0001, t0);
    vca.gain.exponentialRampToValueAtTime(0.2 / (i + 1), t0 + 0.7);
    vca.gain.setValueAtTime(0.2 / (i + 1), t0 + duration * 0.6);
    vca.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(vca).connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  });
}

/** Le claquement de doigts : transitoire sec + queue de bruit filtré. */
export function playSnap() {
  if (!live()) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  const hp = ctx.createBiquadFilter();
  const vca = ctx.createGain();
  src.buffer = noise();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  vca.gain.setValueAtTime(0.9, t0);
  vca.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  src.connect(hp).connect(vca).connect(master);
  src.start(t0);
  src.stop(t0 + 0.2);
  tone({ freq: 2400, dur: 0.05, type: 'triangle', gain: 0.3 });
}

/** Whoosh de transition (ouverture de portail, changement de scène). */
export function playWhoosh(duration = 0.7) {
  if (!live()) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  const bp = ctx.createBiquadFilter();
  const vca = ctx.createGain();
  src.buffer = noise();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(1800, t0);
  bp.frequency.exponentialRampToValueAtTime(260, t0 + duration);
  vca.gain.setValueAtTime(0.0001, t0);
  vca.gain.exponentialRampToValueAtTime(0.22, t0 + 0.08);
  vca.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bp).connect(vca).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

// ── Sons d'interface ─────────────────────────────────────────────────────────

export function playClick() {
  if (!live()) return;
  tone({ freq: 1250, dur: 0.05, type: 'triangle', gain: 0.1 });
}

/** Tick de scan/compteur : très court, très discret. */
export function playTick() {
  if (!live()) return;
  tone({ freq: 2100, dur: 0.028, type: 'square', gain: 0.035 });
}

/** Pierre débloquée / bonne réponse : quinte montante. */
export function playChime(root = 659.25) {
  if (!live()) return;
  marimba(root, 0, 0.22);
  marimba(root * 1.5, 0.11, 0.18);
}

export function playError() {
  if (!live()) return;
  tone({ freq: 180, dur: 0.22, type: 'sawtooth', gain: 0.12 });
  tone({ freq: 120, dur: 0.3, type: 'sawtooth', gain: 0.1, at: 0.06 });
}

/** Verrouillage de cible (HUD carte). */
export function playLock() {
  if (!live()) return;
  tone({ freq: 880, dur: 0.09, type: 'square', gain: 0.08 });
  tone({ freq: 1320, dur: 0.14, type: 'square', gain: 0.07, at: 0.1 });
}

// ── Ambiance ─────────────────────────────────────────────────────────────────

/** Drone grave continu : donne du poids aux scènes du multivers. */
export function startDrone(freq = 55) {
  if (!live() || voices.has('drone')) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const sub = ctx.createOscillator();
  const vca = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lp.type = 'lowpass';
  lp.frequency.value = 340;
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  sub.type = 'sine';
  sub.frequency.value = freq / 2;

  // Respiration lente du volume : évite le bourdonnement statique.
  lfo.frequency.value = 0.09;
  lfoGain.gain.value = 0.022;
  lfo.connect(lfoGain).connect(vca.gain);

  vca.gain.setValueAtTime(0.0001, t0);
  vca.gain.exponentialRampToValueAtTime(0.05, t0 + 2.5);

  osc.connect(lp).connect(vca).connect(master);
  sub.connect(vca);
  osc.start(t0);
  sub.start(t0);
  lfo.start(t0);

  voices.set('drone', () => {
    const now = ctx.currentTime;
    vca.gain.cancelScheduledValues(now);
    vca.gain.setTargetAtTime(0.0001, now, 0.4);
    [osc, sub, lfo].forEach((n) => n.stop(now + 2));
  });
}

export function stopDrone() {
  const stop = voices.get('drone');
  if (stop) {
    stop();
    voices.delete('drone');
  }
}

/** Coupe tout son persistant (démontage, navigation). */
export function stopAll() {
  voices.forEach((stop) => stop());
  voices.clear();
}

// ── Haptique ─────────────────────────────────────────────────────────────────

/** Vibration ; ignorée silencieusement sur iOS Safari qui ne l'implémente pas. */
export function haptic(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté */
  }
}

export const HAPTIC = {
  tap: 12,
  soft: 22,
  ring: [520, 340, 520, 340, 520, 1200],
  impact: [42, 26, 90],
  snap: [16, 40, 220],
};

