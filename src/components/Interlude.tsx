import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

const NOTES = [
  {
    q: "Boredom is just a brain with no load on it. Give it a load.",
    a: "field note 01 — on idling",
  },
  {
    q: "Nothing on this page is useful. That is the entire point of it.",
    a: "field note 02 — on utility",
  },
  {
    q: "You have been staring at particles for several minutes now. Good.",
    a: "field note 03 — on attention",
  },
  {
    q: "Every machine here was built to avoid doing something else.",
    a: "field note 04 — on procrastination",
  },
];

export default function Interlude() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % NOTES.length), 5200);
    return () => window.clearInterval(id);
  }, [paused]);

  const note = NOTES[i];

  return (
    <section
      className="relative overflow-hidden border-y border-bone/10 bg-ink-2/50 py-14 md:py-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full border border-bone/10 spin-slow"
        style={{ borderStyle: "dashed" }}
      />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-7">
        <div className="flex flex-wrap gap-2">
          {NOTES.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`show note ${k + 1}`}
              onClick={() => setI(k)}
              className={cn(
                "h-1.5 transition-all duration-500",
                k === i ? "w-12 bg-amber" : "w-6 bg-bone/20 hover:bg-bone/45",
              )}
            />
          ))}
        </div>

        <blockquote key={i} className="quote-in mt-6 max-w-4xl">
          <p className="font-display text-[clamp(1.5rem,4.6vw,2.9rem)] leading-[1.06] font-extrabold tracking-tight text-balance">
            “{note.q}”
          </p>
          <footer className="mt-4 font-mono text-[0.6rem] tracking-[0.24em] text-ash uppercase">
            {note.a} <span className="text-amber">·</span> the boredom machine
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
