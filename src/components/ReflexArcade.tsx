import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useBoredom, useStore } from "../lib/boredom";
import { play, unlockAudio } from "../lib/audio";
import { cn } from "../utils/cn";

const CELLS = 16;
const DURATION = 30000;
const FREEZE_MS = 3000;
const KEYS = ["q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v", "u", "i", "o", "p"];
const LEVELS = [0, 120, 260, 420, 600];

type Kind = "normal" | "gold" | "bomb" | "freeze";
type Dot = { id: number; cell: number; kind: Kind; born: number; life: number };
type Pop = { id: number; cell: number; text: string; color: string };
type Phase = "ready" | "running" | "over";

const KIND: Record<Kind, { color: string; points: number; life: number; weight: number }> = {
  normal: { color: "#35e39f", points: 10, life: 1500, weight: 0.62 },
  gold: { color: "#ffb020", points: 35, life: 900, weight: 0.15 },
  bomb: { color: "#ff5f45", points: -20, life: 1700, weight: 0.15 },
  freeze: { color: "#8fe3ff", points: 0, life: 1400, weight: 0.08 },
};
const KINDS: Kind[] = ["normal", "gold", "bomb", "freeze"];

/** Mutable run state lives in a ref so the rAF loop never reads stale React state. */
type Run = {
  dots: Dot[];
  score: number;
  combo: number;
  hits: number;
  fouls: number;
  bestCombo: number;
  startedAt: number;
  lastNow: number;
  lastSpawn: number;
  frozenUntil: number;
  wasFrozen: boolean;
  level: number;
  running: boolean;
  ended: boolean;
  raf: number;
  bestAtStart: number;
};

const freshRun = (): Run => ({
  dots: [],
  score: 0,
  combo: 0,
  hits: 0,
  fouls: 0,
  bestCombo: 0,
  startedAt: 0,
  lastNow: 0,
  lastSpawn: 0,
  frozenUntil: 0,
  wasFrozen: false,
  level: 1,
  running: false,
  ended: true,
  raf: 0,
  bestAtStart: 0,
});

const mult = (combo: number) => 1 + Math.min(1.5, Math.floor(combo / 4) * 0.25);

function pickKind(): Kind {
  const r = Math.random();
  let acc = 0;
  for (const k of KINDS) {
    acc += KIND[k].weight;
    if (r < acc) return k;
  }
  return "normal";
}

function KindGlyph({ kind }: { kind: Kind }) {
  if (kind === "bomb") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="#2a0d07" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  if (kind === "gold") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#3a2603">
        <path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z" />
      </svg>
    );
  }
  if (kind === "freeze") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="#0b2a33" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
      </svg>
    );
  }
  return null;
}

export default function ReflexArcade() {
  const { nudge, track, trackMax, logRun } = useBoredom();
  const best = useStore((s) => s.stats.arcadeBest);
  const runs = useStore((s) => s.runs);
  const bestRef = useRef(best);
  bestRef.current = best;

  const [phase, setPhase] = useState<Phase>("ready");
  const [dotsView, setDotsView] = useState<Dot[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [fouls, setFouls] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [level, setLevel] = useState(1);
  const [frozen, setFrozen] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const [shaking, setShaking] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const run = useRef<Run>(freshRun());
  const idRef = useRef(1);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const pushPop = (cell: number, text: string, color: string) => {
    const id = idRef.current++;
    setPops((p) => [...p.slice(-5), { id, cell, text, color }]);
    later(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  };

  const kick = () => {
    setShaking(true);
    later(() => setShaking(false), 320);
  };

  const flash = (text: string) => {
    setBanner(text);
    later(() => setBanner(null), 1000);
  };

  const finish = () => {
    const r = run.current;
    if (r.ended) return;
    r.ended = true;
    r.running = false;
    cancelAnimationFrame(r.raf);
    r.dots = [];
    setDotsView([]);
    setFrozen(false);
    setLeft(0);
    setPhase("over");
    logRun(r.score);
    trackMax("arcadeBest", r.score);
    track("arcadeRuns");
    if (r.hits) track("arcadeHits", r.hits);
    play("end");
    nudge(6, "PLAYED THE ARCADE");
  };

  const tick = (now: number) => {
    const r = run.current;
    if (!r.running || r.ended) return;

    const dt = now - r.lastNow;
    r.lastNow = now;

    // Freeze holds the clock by pushing the start, spawn and every target's birth forward.
    const isFrozen = now < r.frozenUntil;
    if (isFrozen !== r.wasFrozen) {
      r.wasFrozen = isFrozen;
      setFrozen(isFrozen);
    }
    if (isFrozen) {
      r.startedAt += dt;
      r.lastSpawn += dt;
      r.dots = r.dots.map((d) => ({ ...d, born: d.born + dt }));
    }

    const elapsed = now - r.startedAt;
    const remaining = Math.max(0, DURATION - elapsed);
    setLeft((prev) => (Math.abs(prev - remaining) < 60 && remaining > 0 ? prev : remaining));
    if (remaining <= 0) {
      finish();
      return;
    }

    const lvl = LEVELS.reduce((acc, t, i) => (r.score >= t ? i + 1 : acc), 1);
    if (lvl > r.level) {
      r.level = lvl;
      setLevel(lvl);
      flash(`LEVEL ${lvl}`);
      play("level");
    }

    const diff = 1 + (elapsed / DURATION) * 1.5 + r.score / 900;
    const gap = Math.max(260, 720 / diff);
    const maxDots = Math.min(5, 1 + Math.floor(diff));
    let changed = false;

    if (!isFrozen && now - r.lastSpawn > gap && r.dots.length < maxDots) {
      r.lastSpawn = now;
      const taken = new Set(r.dots.map((d) => d.cell));
      const free = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !taken.has(i));
      if (free.length) {
        const kind = pickKind();
        r.dots = [
          ...r.dots,
          {
            id: idRef.current++,
            cell: free[Math.floor(Math.random() * free.length)],
            kind,
            born: now,
            life: KIND[kind].life / Math.min(2.1, diff * 0.9 + 0.4),
          },
        ];
        changed = true;
      }
    }

    const alive: Dot[] = [];
    let missed = false;
    for (const d of r.dots) {
      if (now - d.born < d.life) {
        alive.push(d);
      } else {
        changed = true;
        if (d.kind === "normal" || d.kind === "gold") missed = true;
      }
    }
    if (missed) {
      r.combo = 0;
      setCombo(0);
    }
    r.dots = alive;
    if (changed) setDotsView(alive.slice());

    r.raf = requestAnimationFrame(tick);
  };

  const start = () => {
    unlockAudio();
    cancelAnimationFrame(run.current.raf);
    const now = performance.now();
    run.current = {
      ...freshRun(),
      startedAt: now,
      lastNow: now,
      lastSpawn: now - 600,
      running: true,
      ended: false,
      bestAtStart: bestRef.current,
    };
    setPhase("running");
    setDotsView([]);
    setScore(0);
    setCombo(0);
    setHits(0);
    setFouls(0);
    setLeft(DURATION);
    setFrozen(false);
    setLevel(1);
    flash("GO");
    run.current.raf = requestAnimationFrame(tick);
    nudge(1, "STARTED A RUN");
  };

  const hitDot = (dot: Dot) => {
    const r = run.current;
    if (!r.running || r.ended) return;
    const now = performance.now();
    const reaction = Math.round(now - dot.born);
    r.dots = r.dots.filter((d) => d.id !== dot.id);
    const meta = KIND[dot.kind];

    if (dot.kind === "bomb") {
      r.score = Math.max(0, r.score + meta.points);
      r.combo = 0;
      r.fouls++;
      setFouls(r.fouls);
      play("bomb");
      kick();
      pushPop(dot.cell, `${meta.points}`, meta.color);
    } else if (dot.kind === "freeze") {
      r.frozenUntil = now + FREEZE_MS;
      play("freeze");
      pushPop(dot.cell, "TIME FROZEN", meta.color);
      flash("FROZEN");
      track("freezes");
      nudge(3, "FROZE TIME");
    } else {
      r.combo++;
      r.hits++;
      r.bestCombo = Math.max(r.bestCombo, r.combo);
      const gained = Math.round(meta.points * mult(r.combo));
      r.score += gained;
      if (dot.kind === "gold") play("gold");
      else play("hit", 520 * Math.pow(2, Math.min(r.combo, 24) / 12), { vol: 0.22 });
      pushPop(dot.cell, `+${gained} · ${reaction}ms`, meta.color);
      setHits(r.hits);
      if (r.hits % 10 === 0) nudge(2, "COMBO");
    }

    setScore(r.score);
    setCombo(r.combo);
    setDotsView(r.dots.slice());
    if (dot.kind !== "freeze") nudge(0.3);
  };

  const whiff = (cell: number) => {
    const r = run.current;
    if (!r.running || r.ended) return;
    r.combo = 0;
    r.fouls++;
    r.score = Math.max(0, r.score - 4);
    play("whiff");
    kick();
    pushPop(cell, "−4 whiff", "#a2938a");
    setCombo(0);
    setFouls(r.fouls);
    setScore(r.score);
  };

  const tapCell = (cell: number) => {
    const dot = run.current.dots.find((d) => d.cell === cell);
    if (dot) hitDot(dot);
    else whiff(cell);
  };

  // Keyboard: QWER / ASDF / ZXCV / UIOP tap cells, space starts a run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.tagName === "BUTTON")) return;
      if (run.current.running) {
        const idx = KEYS.indexOf(e.key.toLowerCase());
        if (idx >= 0) {
          e.preventDefault();
          tapCell(idx);
        }
        return;
      }
      if (e.code === "Space") {
        const el = document.getElementById("reflex");
        const rect = el?.getBoundingClientRect();
        if (rect && rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
          e.preventDefault();
          start();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.current.raf);
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const accuracy = hits + fouls > 0 ? Math.round((hits / (hits + fouls)) * 100) : 100;
  const maxHist = Math.max(1, ...runs, best);

  return (
    <SectionShell
      id="reflex"
      index="04"
      kicker="30-second reflex test"
      title="Hands. Do they still work?"
      blurb="Thirty seconds. Tap the green ones, chase the gold, and leave the red ones alone. Blue snowflakes freeze the clock for three seconds. Every four hits raises your multiplier, and every new level makes the machine faster."
      accent="#58b6ff"
      controls={
        <>
          <button
            className={cn("btn border-sky/70 bg-sky text-ink hover:bg-bone", phase === "running" && "opacity-40")}
            onClick={start}
            disabled={phase === "running"}
            type="button"
          >
            {phase === "running" ? "running…" : "▶ start run"}
          </button>
          <span className="kbd hidden sm:block">space</span>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
        <div className={cn("panel relative p-4 transition-shadow", shaking && "shake", phase === "running" && combo >= 8 && "hot-glow")}>
          <div className="mb-3 h-1.5 w-full overflow-hidden bg-bone/10">
            <div
              className="h-full"
              style={{
                width: `${(left / DURATION) * 100}%`,
                background: left < 6000 ? "#ff5f45" : "linear-gradient(90deg,#58b6ff,#35e39f)",
                transition: phase === "running" ? "width .1s linear" : "width .3s",
              }}
            />
          </div>

          <div className={cn("relative grid grid-cols-4 gap-2 sm:gap-3", frozen && "frozen")}>
            {Array.from({ length: CELLS }, (_, cell) => {
              const dot = dotsView.find((d) => d.cell === cell);
              const m = dot ? KIND[dot.kind] : null;
              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => tapCell(cell)}
                  aria-label={dot ? `${dot.kind} target` : `empty cell ${cell + 1}`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center border transition-colors duration-150",
                    dot ? "border-transparent" : "border-bone/10 bg-bone/[0.02] hover:bg-bone/[0.06]",
                  )}
                >
                  <span aria-hidden className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-bone/[0.07]" />
                  {dot && m ? (
                    <span
                      key={dot.id}
                      className="pop-in relative flex h-[72%] w-[72%] items-center justify-center rounded-full"
                      style={{
                        background: `radial-gradient(circle at 34% 30%, #fff8, ${m.color})`,
                        boxShadow: `0 0 26px -4px ${m.color}`,
                      }}
                    >
                      <svg
                        viewBox="0 0 36 36"
                        aria-hidden
                        className="pointer-events-none absolute -inset-[5px] h-[calc(100%+10px)] w-[calc(100%+10px)] -rotate-90"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="16.5"
                          fill="none"
                          stroke="rgba(15,12,11,0.5)"
                          strokeWidth="2"
                          pathLength={1}
                          strokeDasharray={1}
                          className="ring-timer"
                          style={{ animationDuration: `${dot.life}ms` }}
                        />
                      </svg>
                      <KindGlyph kind={dot.kind} />
                    </span>
                  ) : null}
                  {pops
                    .filter((p) => p.cell === cell)
                    .map((p) => (
                      <span
                        key={p.id}
                        className="rise-score pointer-events-none absolute top-1 left-1/2 z-10 font-mono text-[0.6rem] font-semibold whitespace-nowrap"
                        style={{ color: p.color }}
                      >
                        {p.text}
                      </span>
                    ))}
                </button>
              );
            })}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: frozen ? 1 : 0,
                background: "radial-gradient(circle at 50% 50%, rgba(143,227,255,0.14), rgba(143,227,255,0.02) 70%)",
              }}
            />
          </div>

          {banner ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pop-in font-display text-[clamp(2.2rem,7vw,4.2rem)] leading-none font-extrabold text-bone drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                {banner}
              </div>
            </div>
          ) : null}

          {phase !== "running" ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/75 backdrop-blur-[2px]">
              <div className="text-center">
                <div className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-none font-extrabold">
                  {phase === "ready" ? "READY?" : "TIME."}
                </div>
                <p className="mt-2 font-mono text-[0.68rem] tracking-[0.18em] text-ash uppercase">
                  {phase === "ready"
                    ? "30 seconds · tap everything green"
                    : `final score ${score}${score > 0 && score > run.current.bestAtStart ? " · new personal best" : ""}`}
                </p>
                <button className="btn mt-4 border-sky bg-sky text-ink hover:bg-bone" onClick={start} type="button">
                  {phase === "ready" ? "▶ go" : "↻ run it back"}
                </button>
                <p className="mt-3 font-mono text-[0.55rem] tracking-[0.14em] text-ash/70 uppercase">
                  or press space · keys q w e r / a s d f / z x c v / u i o p
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="panel flex flex-col gap-3 p-4">
          <div>
            <span className="font-mono text-[0.58rem] tracking-[0.2em] text-ash uppercase">score</span>
            <div className="font-display text-[3.4rem] leading-[0.9] font-extrabold tabular-nums text-sky">{score}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">combo</span>
              <div className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-amber">
                ×{mult(combo).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">accuracy</span>
              <div className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-mint">{accuracy}%</div>
            </div>
            <div>
              <span className="font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">level</span>
              <div className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-plum">{level}</div>
            </div>
            <div>
              <span className="font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">best combo</span>
              <div className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-bone">
                {run.current.bestCombo}
              </div>
            </div>
          </div>

          <div className="border-t border-bone/10 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">personal best</span>
              <span className="font-display text-[1.3rem] font-extrabold tabular-nums text-coral">{best}</span>
            </div>
            {runs.length > 0 ? (
              <>
                <span className="mt-3 block font-mono text-[0.55rem] tracking-[0.16em] text-ash uppercase">last runs</span>
                <div className="mt-2 flex h-14 items-end gap-1">
                  {runs.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 transition-all duration-500"
                      style={{
                        height: `${Math.max(6, (h / maxHist) * 100)}%`,
                        background: h === best ? "#ff5f45" : "rgba(88,182,255,0.55)",
                      }}
                      title={`${h} pts`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 font-mono text-[0.55rem] leading-relaxed tracking-[0.12em] text-ash/70 uppercase">
                no runs logged yet. the machine is judging you silently.
              </p>
            )}
          </div>

          <div className="mt-auto space-y-1.5 border-t border-bone/10 pt-3 font-mono text-[0.55rem] tracking-[0.12em] text-ash uppercase">
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-mint" />+10 target</span>
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber" />+35 gold, vanishes fast</span>
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-coral" />−20 bomb, do not tap</span>
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#8fe3ff]" />freeze the clock 3s</span>
          </div>
        </aside>
      </div>
    </SectionShell>
  );
}
