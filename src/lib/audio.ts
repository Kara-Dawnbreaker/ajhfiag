/* One shared Web Audio engine for sound effects, the life organ and the arcade. */

export type VoiceName =
  | "bell"
  | "marimba"
  | "pad"
  | "pluck"
  | "hit"
  | "gold"
  | "bomb"
  | "freeze"
  | "whiff"
  | "level"
  | "unlock"
  | "end"
  | "click"
  | "poke";

type Engine = { ctx: AudioContext; master: GainNode };

const MUTE_KEY = "bm.muted";
const MASTER = 0.7;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let engine: Engine | null = null;
let muted = readMuted();

export function isMuted(): boolean {
  return muted;
}

/** Call from a user gesture. Creates the AudioContext on first use. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!engine) {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    master.connect(comp);
    comp.connect(ctx.destination);
    engine = { ctx, master };
  }
  if (engine.ctx.state === "suspended") void engine.ctx.resume();
  return engine.ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!m) unlockAudio();
  if (engine) engine.master.gain.setTargetAtTime(m ? 0 : MASTER, engine.ctx.currentTime, 0.03);
}

type Opts = { vol?: number; when?: number; pan?: number };

type ToneOpts = {
  type: OscillatorType;
  f: number;
  t: number;
  peak: number;
  d: number;
  a?: number;
  pan?: number;
  lp?: number;
  slide?: number;
};

function tone(ctx: AudioContext, master: GainNode, o: ToneOpts) {
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, o.t + o.d);

  const a = o.a ?? 0.005;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, o.peak), o.t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + a + o.d);

  let node: AudioNode = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lp;
    node.connect(f);
    node = f;
  }
  node.connect(g);

  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
  g.connect(p);
  p.connect(master);

  osc.start(o.t);
  osc.stop(o.t + a + o.d + 0.06);
}

/** Plays a voice. Silently does nothing until unlockAudio() has run, or while muted. */
export function play(voice: VoiceName, freq = 440, opts: Opts = {}) {
  if (!engine || muted) return;
  const { ctx, master } = engine;
  const t = ctx.currentTime + (opts.when ?? 0) + 0.005;
  const v = opts.vol ?? 0.3;
  const pan = opts.pan ?? 0;

  switch (voice) {
    case "bell":
      tone(ctx, master, { type: "triangle", f: freq, t, peak: v, d: 1.4, pan });
      tone(ctx, master, { type: "sine", f: freq * 2.005, t, peak: v * 0.2, d: 0.5, pan });
      break;
    case "marimba":
      tone(ctx, master, { type: "sine", f: freq, t, peak: v, d: 0.45, pan });
      tone(ctx, master, { type: "sine", f: freq * 4, t, peak: v * 0.12, d: 0.1, pan });
      break;
    case "pad":
      tone(ctx, master, { type: "sawtooth", f: freq, t, a: 0.35, peak: v * 0.6, d: 2.4, pan, lp: 900 });
      break;
    case "pluck":
      tone(ctx, master, { type: "square", f: freq, t, peak: v * 0.35, d: 0.2, pan, lp: 2200 });
      break;
    case "hit":
      tone(ctx, master, { type: "sine", f: freq, t, peak: v, d: 0.14, pan });
      tone(ctx, master, { type: "triangle", f: freq * 2, t, peak: v * 0.25, d: 0.06, pan });
      break;
    case "gold":
      tone(ctx, master, { type: "triangle", f: 880, t, peak: v, d: 0.12, pan });
      tone(ctx, master, { type: "triangle", f: 1320, t: t + 0.06, peak: v, d: 0.18, pan });
      break;
    case "bomb":
      tone(ctx, master, { type: "sawtooth", f: 110, t, peak: v, d: 0.45, slide: 28, lp: 700, pan });
      break;
    case "freeze":
      tone(ctx, master, { type: "sine", f: 1700, t, a: 0.02, peak: v * 0.7, d: 0.7, slide: 3200, pan });
      tone(ctx, master, { type: "sine", f: 2400, t: t + 0.08, peak: v * 0.3, d: 0.5, pan });
      break;
    case "whiff":
      tone(ctx, master, { type: "triangle", f: 220, t, peak: v * 0.5, d: 0.09, slide: 140, pan });
      break;
    case "level":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ctx, master, { type: "triangle", f, t: t + i * 0.07, peak: v, d: 0.25, pan }),
      );
      break;
    case "unlock":
      [659.25, 880, 1174.66].forEach((f, i) =>
        tone(ctx, master, { type: "sine", f, t: t + i * 0.09, peak: v, d: 0.5, pan }),
      );
      break;
    case "end":
      [392, 329.63, 261.63].forEach((f, i) =>
        tone(ctx, master, { type: "triangle", f, t: t + i * 0.12, peak: v, d: 0.4, lp: 1800, pan }),
      );
      break;
    case "click":
      tone(ctx, master, { type: "sine", f: 1200, t, peak: v * 0.4, d: 0.03, pan });
      break;
    case "poke":
      tone(ctx, master, { type: "square", f: 600, t, peak: v * 0.15, d: 0.08, slide: 900, lp: 2000, pan });
      break;
  }
}
