import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useBoredom, useStore } from "../lib/boredom";
import { play, unlockAudio } from "../lib/audio";
import { cn } from "../utils/cn";

type Point = { x: number; y: number };
const START_WINDOW = 2000;
const MIN_WINDOW = 650;
const STEP_EVERY = 5;
const STEP_MS = 120;

function randomPoint(previous?: Point): Point {
  let next = { x: 12 + Math.random() * 76, y: 14 + Math.random() * 70 };
  if (previous) {
    let tries = 0;
    while (Math.hypot(next.x - previous.x, next.y - previous.y) < 25 && tries++ < 12) {
      next = { x: 12 + Math.random() * 76, y: 14 + Math.random() * 70 };
    }
  }
  return next;
}

export default function Blink() {
  const { nudge, track, trackMax } = useBoredom();
  const best = useStore((s) => s.stats.blinkBest);
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [windowMs, setWindowMs] = useState(START_WINDOW);
  const [left, setLeft] = useState(START_WINDOW);
  const [point, setPoint] = useState<Point>({ x: 50, y: 50 });
  const [message, setMessage] = useState("TAP BEFORE THE CLOCK RUNS OUT");
  const [missed, setMissed] = useState(false);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const deadline = useRef(0);
  const raf = useRef(0);
  const activeRef = useRef(false);
  const scoreRef = useRef(0);
  const chainRef = useRef(0);
  const windowRef = useRef(START_WINDOW);
  const pointRef = useRef<Point>(point);

  const finish = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setActive(false);
    setMissed(true);
    setMessage("TOO SLOW. STREAK RESET.");
    track("blinkRuns");
    trackMax("blinkBest", scoreRef.current);
    play("end");
    nudge(2, "BLINK RUN ENDED");
    cancelAnimationFrame(raf.current);
  };

  const tick = (now: number) => {
    if (!activeRef.current) return;
    const remaining = Math.max(0, deadline.current - now);
    setLeft(remaining);
    if (remaining <= 0) {
      finish();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const start = () => {
    unlockAudio();
    cancelAnimationFrame(raf.current);
    activeRef.current = true;
    scoreRef.current = 0;
    chainRef.current = 0;
    windowRef.current = START_WINDOW;
    const next = randomPoint();
    pointRef.current = next;
    setPoint(next);
    setScore(0);
    setChain(0);
    setWindowMs(START_WINDOW);
    setLeft(START_WINDOW);
    setMissed(false);
    setMessage("GO GO GO");
    deadline.current = performance.now() + START_WINDOW;
    setActive(true);
    raf.current = requestAnimationFrame(tick);
    nudge(1, "STARTED BLINK");
  };

  const hit = () => {
    if (!activeRef.current) return;
    const now = performance.now();
    if (now > deadline.current) {
      finish();
      return;
    }
    scoreRef.current += 1;
    chainRef.current += 1;
    const nextWindow = Math.max(MIN_WINDOW, START_WINDOW - Math.floor(chainRef.current / STEP_EVERY) * STEP_MS);
    windowRef.current = nextWindow;
    deadline.current = now + nextWindow;
    const next = randomPoint(pointRef.current);
    pointRef.current = next;
    setPoint(next);
    setScore(scoreRef.current);
    setChain(chainRef.current);
    setWindowMs(nextWindow);
    setLeft(nextWindow);
    setMessage(chainRef.current >= 20 ? "YOU'RE ABSOLUTELY LOCKED IN" : chainRef.current >= 10 ? "FASTER. FASTER." : "NICE. KEEP MOVING.");
    track("blinkHits");
    play("hit", 600 + Math.min(500, chainRef.current * 12), { vol: 0.18 });
    if (chainRef.current % 5 === 0) {
      play("level");
      nudge(1, "BLINK STREAK");
    } else {
      nudge(0.2);
    }
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const pct = Math.max(0, Math.min(100, (left / Math.max(1, windowMs)) * 100));

  return (
    <SectionShell
      id="blink"
      index="04"
      kicker="the disappearing target"
      title="Blink. Don't think."
      blurb="One button. A whole playfield. Tap it before the two-second clock expires and it instantly jumps somewhere else. Every five hits shave time off your allowance, down to a brutal 0.65 seconds. Miss the deadline and your streak resets."
      accent="#ffb020"
      controls={<button className={cn("btn border-amber/70 bg-amber text-ink hover:bg-bone", active && "opacity-50")} onClick={start} disabled={active} type="button">{active ? "in motion…" : missed ? "↻ try again" : "▶ start blink"}</button>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="panel p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.16em]">
            <span className="text-ash">time to next tap</span>
            <span className={cn("tabular-nums", left < 650 ? "text-coral" : "text-amber")}>{(left / 1000).toFixed(2)}s</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden bg-bone/10">
            <div className="h-full bg-amber transition-[width] duration-75" style={{ width: active ? `${pct}%` : "100%" }} />
          </div>
          <div ref={areaRef} className="relative min-h-[360px] overflow-hidden border border-bone/15 bg-[#100e0d] sm:min-h-[440px]" style={{ backgroundImage: "radial-gradient(rgba(244,236,224,.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
            {!active && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/75 px-5 text-center backdrop-blur-[2px]">
                <div className="font-display text-3xl font-extrabold sm:text-5xl">{missed ? "STREAK BROKEN" : "READY?"}</div>
                <p className="mt-2 max-w-sm font-mono text-[0.62rem] tracking-[0.12em] text-ash uppercase">{missed ? `You reached ${score} taps. Best record: ${best}.` : "The button can appear anywhere inside this arena. Hit it before zero."}</p>
                <button className="btn mt-5 border-amber bg-amber text-ink hover:bg-bone" onClick={start} type="button">{missed ? "run it back ↻" : "start ↗"}</button>
              </div>
            )}
            <button
              type="button"
              onClick={hit}
              disabled={!active}
              aria-label="Tap the moving Blink target"
              className="absolute z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#fff4d6] bg-amber text-xl font-black text-ink shadow-[0_0_0_8px_rgba(255,176,32,.13),0_0_34px_rgba(255,176,32,.65)] transition-transform active:scale-90 disabled:cursor-default sm:h-[4.5rem] sm:w-[4.5rem]"
              style={{ left: `${point.x}%`, top: `${point.y}%`, opacity: active ? 1 : 0.35 }}
            >
              ↯
            </button>
            <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[0.55rem] tracking-[0.16em] text-bone/35 uppercase">playfield // unrestricted</div>
            {active && <div className="pointer-events-none absolute right-3 bottom-3 font-mono text-[0.55rem] tracking-[0.16em] text-amber/70 uppercase">{message}</div>}
          </div>
        </div>
        <aside className="panel flex flex-col gap-4 p-4">
          <div><div className="font-mono text-[0.58rem] tracking-[0.18em] text-ash uppercase">current score</div><div className="font-display text-6xl font-extrabold leading-none text-amber tabular-nums">{score}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="font-mono text-[0.55rem] text-ash uppercase">streak</div><div className="font-display text-2xl font-bold text-mint">{chain}</div></div>
            <div><div className="font-mono text-[0.55rem] text-ash uppercase">best</div><div className="font-display text-2xl font-bold text-sky">{Math.max(best, score)}</div></div>
          </div>
          <div className="border-t border-bone/10 pt-3"><div className="font-mono text-[0.55rem] tracking-[0.15em] text-ash uppercase">tap allowance</div><div className="mt-1 font-display text-3xl font-bold text-bone">{(windowMs / 1000).toFixed(2)}s</div><p className="mt-1 text-xs leading-relaxed text-ash">Drops by 0.12s every five successful taps. Minimum: 0.65s.</p></div>
          <p className="mt-auto font-mono text-[0.56rem] leading-relaxed tracking-[0.1em] text-ash/70 uppercase">Tip: aim with your eyes, not your cursor. The target avoids its previous position.</p>
        </aside>
      </div>
    </SectionShell>
  );
}
