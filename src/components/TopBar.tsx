import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { useBoredom, useStore } from "../lib/boredom";
import { isMuted, play, setMuted } from "../lib/audio";

const NAV = [
  { id: "flow", label: "Flow", n: "01" },
  { id: "beat", label: "Beat", n: "02" },
  { id: "reflex", label: "Reflex", n: "03" },
  { id: "life", label: "Life", n: "04" },
  { id: "ledger", label: "Ledger", n: "05" },
];

const COLORS = ["#ffb020", "#ff5f45", "#35e39f", "#58b6ff", "#b46bff", "#f4ece0"];

function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 90 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      dx: `${(Math.random() - 0.5) * 46}vw`,
      dr: `${(Math.random() - 0.5) * 1080}deg`,
      dur: `${2 + Math.random() * 1.8}s`,
      delay: `${Math.random() * 0.5}s`,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
    })),
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.i}
          className="confetti-bit"
          style={{
            left: `${b.left}%`,
            background: b.color,
            borderRadius: b.round ? "999px" : "1px",
            ["--dx" as string]: b.dx,
            ["--dr" as string]: b.dr,
            ["--dur" as string]: b.dur,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
}

function Meter({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const color = value > 66 ? "#ff5f45" : value > 33 ? "#ffb020" : "#35e39f";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(244,236,224,0.16)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * value) / 100}
        transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset .45s cubic-bezier(.2,.7,.2,1), stroke .45s" }}
      />
      <text x="20" y="23.5" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9.5" fill={color}>
        {Math.round(value)}
      </text>
    </svg>
  );
}

export default function TopBar() {
  const boredom = useStore((s) => s.boredom);
  const celebrate = useStore((s) => s.celebrate);
  const floats = useStore((s) => s.floats);
  const { reset } = useBoredom();
  const cured = boredom <= 0;

  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("flow");
  const [muted, setMutedUI] = useState(isMuted());

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedUI(next);
    if (!next) play("click");
  };

  return (
    <>
      {celebrate ? <Confetti /> : null}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "bg-ink/88 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 transition-all duration-300 sm:px-7",
            scrolled ? "h-14 border-b border-bone/10" : "h-20 border-b border-transparent",
          )}
        >
          <a href="#top" className="group flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 26 26" className="spin-slow">
              <circle cx="13" cy="13" r="11" fill="none" stroke="#ffb020" strokeWidth="1.6" strokeDasharray="5 4" />
              <circle cx="13" cy="13" r="4.4" fill="#ff5f45" />
            </svg>
            <span className="font-display text-[0.95rem] leading-none font-extrabold tracking-tight">
              THE BOREDOM
              <span className="block font-mono text-[0.55rem] font-medium tracking-[0.34em] text-ash">MACHINE</span>
            </span>
          </a>

          <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className={cn(
                  "group relative px-2.5 py-2 font-mono text-[0.64rem] tracking-[0.14em] uppercase transition-colors",
                  active === n.id ? "text-bone" : "text-ash hover:text-bone",
                )}
              >
                <span className="mr-1.5 text-[0.56rem] opacity-60">{n.n}</span>
                {n.label}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-0.5 h-px origin-left bg-amber transition-transform duration-300",
                    active === n.id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </a>
            ))}
          </nav>

          <div className="relative ml-auto flex items-center gap-2.5 lg:ml-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? "unmute sound" : "mute sound"}
              title={muted ? "sound off" : "sound on"}
              className="flex h-9 w-9 items-center justify-center border border-bone/15 text-ash transition-colors hover:border-bone/40 hover:text-bone"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
              </svg>
            </button>

            <div className="hidden text-right sm:block">
              <div className="font-mono text-[0.55rem] tracking-[0.24em] text-ash uppercase">boredom</div>
              <div
                className={cn(
                  "font-display text-[0.95rem] leading-none font-extrabold tabular-nums",
                  cured ? "text-mint" : "text-bone",
                )}
              >
                {cured ? "CURED" : `${Math.round(boredom)}%`}
              </div>
            </div>
            <Meter value={boredom} />
            {cured ? (
              <button className="btn pop-in" onClick={reset} type="button">
                again
              </button>
            ) : null}

            {floats.map((f) => (
              <span
                key={f.id}
                className="rise-score pointer-events-none absolute top-full right-8 mt-1 font-mono text-[0.62rem] whitespace-nowrap text-mint"
              >
                −{f.amount} {f.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cn(
                "shrink-0 border px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.14em] uppercase",
                active === n.id ? "border-amber/60 bg-amber/15 text-amber" : "border-bone/15 text-ash",
              )}
            >
              {n.n} {n.label}
            </a>
          ))}
        </div>

        <div
          className={cn("h-[2px] w-full transition-opacity duration-300", scrolled ? "opacity-100" : "opacity-0")}
          style={{ background: "rgba(244,236,224,0.08)" }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg,#ff5f45,#ffb020,#35e39f,#58b6ff,#b46bff)",
            }}
          />
        </div>
      </header>
    </>
  );
}
