import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCanvasStage, useReducedMotion, useScramble, usePointer } from "../lib/hooks";
import { useStore } from "../lib/boredom";
import { BADGES, formatDuration } from "../lib/game";

const PHRASES = [
  "STARING AT THE CEILING",
  "REFRESHING NOTHING",
  "COUNTING FLOOR TILES",
  "READING THE SHAMPOO",
  "SCROLLING IN CIRCLES",
];

const MODULES = [
  { n: "01", name: "Flow Field", tag: "paint with maths", href: "#flow", color: "#ffb020" },
  { n: "02", name: "Beat Machine", tag: "drums from thin air", href: "#beat", color: "#ff5f45" },
  { n: "03", name: "Gravity Well", tag: "bend space with a cursor", href: "#gravity", color: "#35e39f" },
  { n: "04", name: "Reflex Arcade", tag: "prove your hands work", href: "#reflex", color: "#58b6ff" },
  { n: "05", name: "The Oracle", tag: "outsource the decision", href: "#oracle", color: "#b46bff" },
  { n: "06", name: "Life Organ", tag: "a sweep that sings", href: "#life", color: "#ff8fd0" },
  { n: "07", name: "The Ledger", tag: "your permanent record", href: "#ledger", color: "#f4ece0" },
];

type Dot = { x: number; y: number; vx: number; vy: number; r: number; c: string };

function HeroCanvas() {
  const reduced = useReducedMotion();
  const dots = useRef<Dot[]>([]);
  const pointer = useRef({ x: -999, y: -999 });
  const last = useRef({ w: 0, h: 0 });

  const { canvasRef } = useCanvasStage(true, (ctx, w, h) => {
    if (last.current.w !== w || last.current.h !== h || dots.current.length === 0) {
      last.current = { w, h };
      const count = Math.round(Math.min(96, Math.max(34, (w * h) / 17000)));
      dots.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        r: 0.8 + Math.random() * 1.9,
        c: ["#ffb020", "#58b6ff", "#35e39f", "#f4ece0", "#ff5f45"][Math.floor(Math.random() * 5)],
      }));
    }
    const step = reduced ? 0 : 1;
    ctx.fillStyle = reduced ? "#0f0c0b" : "rgba(15,12,11,0.16)";
    ctx.fillRect(0, 0, w, h);

    const ps = dots.current;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const dx = p.x - pointer.current.x;
      const dy = p.y - pointer.current.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 26000 && d2 > 1) {
        const f = (1 - d2 / 26000) * 190;
        const d = Math.sqrt(d2);
        p.vx += (dx / d) * f * 0.016;
        p.vy += (dy / d) * f * 0.016;
      }
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * 0.016 * step * 3;
      p.y += p.vy * 0.016 * step * 3;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      for (let j = i + 1; j < ps.length; j++) {
        const q = ps[j];
        const ex = p.x - q.x;
        const ey = p.y - q.y;
        const dd = ex * ex + ey * ey;
        if (dd < 15000) {
          ctx.strokeStyle = `rgba(244,236,224,${(1 - dd / 15000) * 0.14})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onPointerLeave={() => {
        pointer.current = { x: -999, y: -999 };
      }}
    />
  );
}

function Readout({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-bone/10 py-2 last:border-0">
      <span className="font-mono text-[0.6rem] tracking-[0.2em] text-ash uppercase">{label}</span>
      <span className="font-display text-[0.95rem] font-extrabold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

/** Isolated so the once-a-second tick does not re-render the whole hero. */
function LifeClock() {
  const seconds = useStore((s) => s.stats.seconds);
  return <>{formatDuration(seconds)}</>;
}

export default function Hero() {
  const boredom = useStore((s) => s.boredom);
  const events = useStore((s) => s.stats.events);
  const badges = useStore((s) => s.unlocked.length);
  const cured = boredom <= 0;

  const [phraseIdx, setPhraseIdx] = useState(0);
  const scrambled = useScramble(PHRASES[phraseIdx], 26);
  const { ref: tickerRef } = usePointer<HTMLDivElement>();

  useEffect(() => {
    const id = window.setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 3400);
    return () => window.clearInterval(id);
  }, []);

  const ticker = "PAINT · DRUM · ORBIT · REACT · DECIDE · GROW · WASTE TIME ON PURPOSE · ";

  return (
    <section id="top" className="relative min-h-[100svh] overflow-hidden pt-32 md:pt-28">
      <HeroCanvas />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid-lines opacity-70"
        style={{
          maskImage: "radial-gradient(120% 90% at 50% 20%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 20%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-4 pb-28 sm:px-7 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.62rem] tracking-[0.26em] text-ash uppercase">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint blink" />
              cabinet of fiddling № 007
            </span>
            <span className="hidden h-3 w-px bg-bone/25 sm:block" />
            <span>seven stations · one permanent record</span>
          </div>

          <h1 className="mt-5 font-display leading-[0.78] font-extrabold tracking-[-0.03em]">
            <span className="block text-[clamp(4.2rem,16vw,11.5rem)]">
              BORED<span className="text-coral">?</span>
            </span>
            <span className="text-outline block text-[clamp(2.2rem,7.6vw,5.2rem)]">PERFECT.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-bone/80">
            Six small machines and a ledger that never forgets. Paint with mathematics, build a beat out
            of thin air, bend gravity with your cursor, prove your hands still work, grow a cellular
            world that sings, then let a slot machine plan whatever's left of the day. A little robot
            called PIP is bored too, and will say so.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#flow" className="btn border-amber bg-amber text-ink hover:border-bone hover:bg-bone">
              start fiddling ↓
            </a>
            <a href="#oracle" className="btn">
              randomise my afternoon
            </a>
            <span className="ml-1 hidden items-center gap-2 font-mono text-[0.62rem] text-ash sm:flex">
              <span className="kbd">1</span>–<span className="kbd">7</span> jumps between stations
            </span>
          </div>

          <div className="mt-10 font-mono text-[0.68rem] tracking-[0.2em] text-coral uppercase">
            currently: <span className="text-bone">{scrambled}</span>
            <span className="blink">_</span>
          </div>
        </div>

        <div className="lg:col-span-5 lg:pl-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-bone/10 pb-3">
              <span className="font-mono text-[0.6rem] tracking-[0.24em] text-ash uppercase">machine status</span>
              <span className="flex gap-1.5">
                {["#ff5f45", "#ffb020", "#35e39f"].map((c) => (
                  <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                ))}
              </span>
            </div>

            <div className="mt-2">
              <Readout
                label="boredom level"
                value={cured ? "00% — CURED" : `${Math.round(boredom)}%`}
                accent={cured ? "#35e39f" : undefined}
              />
              <Readout label="time wasted, ever" value={<LifeClock />} accent="#58b6ff" />
              <Readout label="interactions" value={String(events).padStart(4, "0")} accent="#ffb020" />
              <Readout label="badges earned" value={`${badges} / ${BADGES.length}`} accent="#ff8fd0" />
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden bg-bone/10">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${100 - boredom}%`, background: "linear-gradient(90deg,#ff5f45,#ffb020,#35e39f)" }}
              />
            </div>
            <p className="mt-2 font-mono text-[0.58rem] tracking-[0.14em] text-ash uppercase">
              amusement fills as boredom drains. stop too long and it creeps back.
            </p>
          </div>

          <ul className="mt-5">
            {MODULES.map((m) => (
              <li key={m.n}>
                <a href={m.href} className="group flex items-center gap-4 border-b border-bone/10 py-2.5 transition-colors hover:border-bone/30">
                  <span className="font-mono text-[0.62rem] text-ash transition-colors group-hover:text-bone">{m.n}</span>
                  <span className="font-display text-[1.1rem] font-extrabold tracking-tight transition-transform duration-300 group-hover:translate-x-1.5">
                    {m.name}
                  </span>
                  <span className="ml-auto hidden font-mono text-[0.6rem] tracking-[0.14em] text-ash uppercase sm:block">{m.tag}</span>
                  <span
                    className="h-2.5 w-2.5 rotate-45 transition-all duration-300 group-hover:scale-150"
                    style={{ background: m.color }}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div ref={tickerRef} className="absolute inset-x-0 bottom-0 overflow-hidden border-y border-bone/10 bg-ink-2/70 py-2.5">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center font-display text-[0.9rem] font-extrabold tracking-[0.16em] whitespace-nowrap text-bone/70">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="flex items-center">
                  {ticker}
                  <span className="mx-2 inline-block h-1.5 w-1.5 rotate-45 bg-coral" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
