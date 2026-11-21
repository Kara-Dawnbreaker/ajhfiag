import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useCanvasStage } from "../lib/hooks";
import { useBoredom } from "../lib/boredom";
import { play, unlockAudio, type VoiceName } from "../lib/audio";
import { cn } from "../utils/cn";

const COLS = 40;
const ROWS = 18;
const N = COLS * ROWS;

type Rule = {
  id: string;
  name: string;
  birth: number[];
  survive: number[];
  voice: VoiceName;
  scale: number[];
  blurb: string;
};

const RULES: Rule[] = [
  { id: "life", name: "Life", birth: [3], survive: [2, 3], voice: "bell", scale: [0, 3, 5, 7, 10], blurb: "Conway's original. Minor pentatonic bells." },
  { id: "highlife", name: "HighLife", birth: [3, 6], survive: [2, 3], voice: "marimba", scale: [0, 2, 4, 7, 9], blurb: "Replicators bloom. Bright major marimba." },
  { id: "daynight", name: "Day & Night", birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8], voice: "pad", scale: [0, 2, 3, 7, 8], blurb: "Light and dark mirror each other. Slow dark pads." },
  { id: "seeds", name: "Seeds", birth: [2], survive: [], voice: "pluck", scale: [0, 2, 4, 7, 9], blurb: "Everything dies each generation. Plucked seeds." },
];

const STOPS: [number, number, number][] = [
  [255, 95, 69],
  [255, 176, 32],
  [53, 227, 159],
  [88, 182, 255],
  [180, 107, 255],
];

function colorAt(t: number): string {
  const seg = t * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

/** Low rows are coral, high rows are plum. */
const ROW_COLORS = Array.from({ length: ROWS }, (_, r) => colorAt((ROWS - 1 - r) / (ROWS - 1)));

function noteFreq(row: number, rule: Rule): number {
  const n = ROWS - 1 - row;
  const len = rule.scale.length;
  const semis = Math.floor(n / len) * 12 + rule.scale[n % len];
  return 98 * Math.pow(2, semis / 12);
}

function stepGrid(g: Uint8Array, rule: Rule): Uint8Array {
  const out = new Uint8Array(N);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          n += g[((r + dr + ROWS) % ROWS) * COLS + ((c + dc + COLS) % COLS)];
        }
      }
      const i = r * COLS + c;
      out[i] = g[i] ? (rule.survive.includes(n) ? 1 : 0) : rule.birth.includes(n) ? 1 : 0;
    }
  }
  return out;
}

function randomGrid(density: number): Uint8Array {
  const g = new Uint8Array(N);
  for (let i = 0; i < N; i++) g[i] = Math.random() < density ? 1 : 0;
  return g;
}

const GLIDER = [".#.", "..#", "###"];
const PULSAR = [
  "..###...###..",
  ".............",
  "#....#.#....#",
  "#....#.#....#",
  "#....#.#....#",
  "..###...###..",
  ".............",
  "..###...###..",
  "#....#.#....#",
  "#....#.#....#",
  "#....#.#....#",
  ".............",
  "..###...###..",
];
/** Gosper glider gun, 36 by 9. Checked by simulation: it emits gliders. */
const GUN: [number, number][] = [
  [24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
  [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4],
  [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
  [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8],
];

function stampRows(rows: string[]): Uint8Array {
  const g = new Uint8Array(N);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const ox = Math.floor((COLS - w) / 2);
  const oy = Math.floor((ROWS - h) / 2);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") g[(oy + y) * COLS + ox + x] = 1;
    }
  });
  return g;
}

function stampGun(): Uint8Array {
  const g = new Uint8Array(N);
  GUN.forEach(([x, y]) => {
    g[(y + 4) * COLS + x + 2] = 1;
  });
  return g;
}

const PRESET_LABEL: Record<string, string> = {
  soup: "LOADED SOUP",
  glider: "LOADED GLIDER",
  pulsar: "LOADED PULSAR",
  gun: "LOADED GUN",
  clear: "CLEARED LIFE",
};

function presetGrid(kind: string): Uint8Array {
  if (kind === "glider") return stampRows(GLIDER);
  if (kind === "pulsar") return stampRows(PULSAR);
  if (kind === "gun") return stampGun();
  if (kind === "soup") return randomGrid(0.22);
  return new Uint8Array(N);
}

export default function LifeOrgan() {
  const { nudge, track } = useBoredom();
  const [ruleIdx, setRuleIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [ui, setUi] = useState({ gen: 0, pop: 0 });
  const [init] = useState(() => ({
    g: randomGrid(0.22),
    a: new Uint8Array(N),
    f: new Float32Array(COLS),
  }));

  const gridRef = useRef<Uint8Array>(init.g);
  const ageRef = useRef<Uint8Array>(init.a);
  const flashRef = useRef<Float32Array>(init.f);
  const genRef = useRef(0);
  const acc = useRef(0);
  const total = useRef(0);
  const head = useRef(0);
  const pending = useRef(0);
  const drag = useRef({ on: false, value: 1 });
  const cfg = useRef({ playing: false, bpm: 120, ruleIdx: 0 });
  cfg.current = { playing, bpm, ruleIdx };

  const evolve = () => {
    const rule = RULES[cfg.current.ruleIdx];
    const g = gridRef.current;
    const a = ageRef.current;
    const out = stepGrid(g, rule);
    for (let i = 0; i < N; i++) {
      a[i] = out[i] ? (g[i] ? Math.min(255, a[i] + 1) : 0) : 0;
    }
    gridRef.current = out;
    genRef.current++;
    track("gens");
  };

  const playColumn = (c: number) => {
    const rule = RULES[cfg.current.ruleIdx];
    const g = gridRef.current;
    let n = 0;
    for (let r = 0; r < ROWS; r++) if (g[r * COLS + c]) n++;
    if (!n) return;
    const vol = 0.22 / Math.sqrt(n);
    const pan = (c / (COLS - 1)) * 1.2 - 0.6;
    let k = 0;
    for (let r = ROWS - 1; r >= 0 && k < 10; r--) {
      if (g[r * COLS + c]) {
        play(rule.voice, noteFreq(r, rule), { vol, pan });
        k++;
      }
    }
    pending.current += k;
  };

  const paint = (i: number, v: number) => {
    const g = gridRef.current;
    if (g[i] === v) return;
    g[i] = v;
    ageRef.current[i] = 0;
    if (v) {
      unlockAudio();
      const rule = RULES[cfg.current.ruleIdx];
      play(rule.voice, noteFreq(Math.floor(i / COLS), rule), {
        vol: 0.14,
        pan: ((i % COLS) / (COLS - 1)) * 1.2 - 0.6,
      });
    }
  };

  const { canvasRef } = useCanvasStage(true, (ctx, w, h, dt) => {
    const c = cfg.current;
    const flash = flashRef.current;

    if (c.playing) {
      // Sixteenth notes: one column per step, one generation per full sweep.
      acc.current += dt * (c.bpm / 60) * 4;
      while (acc.current >= 1) {
        acc.current -= 1;
        total.current++;
        const col = total.current % COLS;
        if (col === 0) evolve();
        playColumn(col);
        flash[col] = 1;
      }
    }
    head.current = (total.current % COLS) + acc.current;
    for (let x = 0; x < COLS; x++) flash[x] = Math.max(0, flash[x] - dt * 2.4);

    const cw = w / COLS;
    const ch = h / ROWS;
    const pad = Math.max(1, Math.min(cw, ch) * 0.16);
    const g = gridRef.current;
    const a = ageRef.current;

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0f0c0b";
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < COLS; x++) {
      if (flash[x] > 0.01) {
        ctx.fillStyle = `rgba(255,176,32,${flash[x] * 0.16})`;
        ctx.fillRect(x * cw, 0, cw, h);
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let x = 0; x < COLS; x++) {
        const i = r * COLS + x;
        if (g[i]) {
          ctx.globalAlpha = Math.min(1, 0.45 + a[i] / 10);
          ctx.fillStyle = ROW_COLORS[r];
          ctx.fillRect(x * cw + pad, r * ch + pad, cw - pad * 2, ch - pad * 2);
        } else {
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = "#f4ece0";
          ctx.fillRect(x * cw + cw / 2 - 0.6, r * ch + ch / 2 - 0.6, 1.2, 1.2);
        }
      }
    }
    ctx.globalAlpha = 1;

    const hx = head.current * cw;
    ctx.fillStyle = c.playing ? "rgba(244,236,224,0.10)" : "rgba(244,236,224,0.04)";
    ctx.fillRect(hx - cw * 0.5, 0, cw, h);
    ctx.fillStyle = c.playing ? "rgba(244,236,224,0.85)" : "rgba(244,236,224,0.35)";
    ctx.fillRect(hx - 0.75, 0, 1.5, h);
  });

  // Low-rate UI refresh, plus batched note counts for the ledger.
  useEffect(() => {
    const id = window.setInterval(() => {
      const g = gridRef.current;
      let pop = 0;
      for (let i = 0; i < N; i++) pop += g[i];
      if (pending.current > 0) {
        track("notes", pending.current);
        pending.current = 0;
      }
      const gen = genRef.current;
      setUi((u) => (u.gen === gen && u.pop === pop ? u : { gen, pop }));
    }, 250);
    return () => window.clearInterval(id);
  }, [track]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(COLS - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * COLS)));
    const y = Math.min(ROWS - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * ROWS)));
    return y * COLS + x;
  };

  const togglePlay = () => {
    unlockAudio();
    const next = !playing;
    setPlaying(next);
    if (next) nudge(3, "LIFE SPARKED");
  };

  const stepOnce = () => {
    evolve();
    nudge(1, "LIFE STEPPED");
  };

  const loadPreset = (kind: string) => {
    gridRef.current = presetGrid(kind);
    ageRef.current = new Uint8Array(N);
    genRef.current = 0;
    nudge(1.5, PRESET_LABEL[kind] ?? "LOADED SOUP");
  };

  const chooseRule = (i: number) => {
    setRuleIdx(i);
    nudge(1, "NEW RULE");
  };

  const rule = RULES[ruleIdx];

  return (
    <SectionShell
      id="life"
      index="06"
      kicker="cellular automaton · sweep sequencer"
      title="Life, but it sings."
      blurb="Conway's Game of Life wrapped around a sweeping playhead. Each column plays the living cells it passes: higher rows are higher notes, and every rule has its own instrument. Draw to seed it, pick a rule, and let the sweep play. One full sweep is one generation."
      accent="#ff8fd0"
      controls={
        <>
          <button
            className={cn("btn", playing && "border-mint bg-mint text-ink hover:bg-bone")}
            onClick={togglePlay}
            type="button"
          >
            {playing ? "❚❚ pause" : "▶ sweep"}
          </button>
          <button className="btn" onClick={stepOnce} type="button">
            step
          </button>
          <button className="btn" onClick={() => loadPreset("clear")} type="button">
            clear
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_250px]">
        <div className="panel overflow-hidden">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="block w-full cursor-cell touch-none"
              style={{ aspectRatio: `${COLS} / ${ROWS}` }}
              onPointerDown={(e) => {
                const i = cellAt(e);
                const v = gridRef.current[i] ? 0 : 1;
                drag.current = { on: true, value: v };
                e.currentTarget.setPointerCapture(e.pointerId);
                paint(i, v);
                nudge(0.5, v ? "SEEDED LIFE" : "ERASED LIFE");
              }}
              onPointerMove={(e) => {
                if (drag.current.on) paint(cellAt(e), drag.current.value);
              }}
              onPointerUp={() => {
                drag.current.on = false;
              }}
              onPointerCancel={() => {
                drag.current.on = false;
              }}
            />
            <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 font-mono text-[0.58rem] tracking-[0.2em] text-ash uppercase">
              <span className={cn("h-1.5 w-1.5 rounded-full", playing ? "bg-mint blink" : "bg-ash/50")} />
              {playing ? "sweeping" : "paused"} · gen {ui.gen}
            </div>
            <div className="pointer-events-none absolute right-3 bottom-3 font-mono text-[0.58rem] tracking-[0.2em] text-ash/70 uppercase">
              drag to draw
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-bone/10 px-3 py-3">
            {(["soup", "glider", "pulsar", "gun"] as const).map((k) => (
              <button key={k} type="button" className="btn" onClick={() => loadPreset(k)}>
                {k}
              </button>
            ))}
            <label className="ml-auto flex w-44 items-center gap-3">
              <span className="font-mono text-[0.58rem] tracking-[0.16em] text-ash uppercase">tempo</span>
              <input
                type="range"
                min={60}
                max={200}
                step={1}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                onPointerUp={() => nudge(0.5, "TUNED")}
                onKeyUp={() => nudge(0.5, "TUNED")}
              />
              <span className="w-8 text-right font-display text-sm font-extrabold tabular-nums">{bpm}</span>
            </label>
          </div>
        </div>

        <aside className="panel flex flex-col gap-4 p-4">
          <div>
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">rule</span>
            <ul className="mt-2 space-y-1.5">
              {RULES.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => chooseRule(i)}
                    className={cn(
                      "w-full border px-3 py-2 text-left transition-colors",
                      ruleIdx === i ? "border-bone/70 bg-bone/10" : "border-bone/12 hover:border-bone/35",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-display text-[0.95rem] font-extrabold">{r.name}</span>
                      <span className="font-mono text-[0.55rem] tracking-[0.14em] text-ash uppercase">{r.voice}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[0.6rem] leading-relaxed tracking-[0.08em] text-ash">{rule.blurb}</p>
          </div>

          <div className="mt-auto space-y-1.5 border-t border-bone/10 pt-3">
            <div className="flex justify-between font-mono text-[0.58rem] tracking-[0.16em] text-ash uppercase">
              <span>generation</span>
              <span className="text-bone tabular-nums">{ui.gen}</span>
            </div>
            <div className="flex justify-between font-mono text-[0.58rem] tracking-[0.16em] text-ash uppercase">
              <span>population</span>
              <span className="text-bone tabular-nums">{ui.pop}</span>
            </div>
            <div className="mt-3 h-1.5 w-full" style={{ background: "linear-gradient(90deg,#ff5f45,#ffb020,#35e39f,#58b6ff,#b46bff)" }} />
            <div className="flex justify-between font-mono text-[0.5rem] tracking-[0.16em] text-ash uppercase">
              <span>low</span>
              <span>high</span>
            </div>
          </div>
        </aside>
      </div>
    </SectionShell>
  );
}
