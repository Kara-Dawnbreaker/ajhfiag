import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useBoredom, useStore } from "../lib/boredom";
import { play, unlockAudio } from "../lib/audio";
import { cn } from "../utils/cn";

const VERBS = [
  "Learn", "Build", "Draw", "Cook", "Write", "Fix", "Borrow", "Rearrange",
  "Photograph", "Name", "Invent", "Translate", "Choreograph", "Catalogue", "Sabotage", "Compose",
];

const SUBJECTS = [
  "a tiny synthesiser", "the perfect sandwich", "a map of your street", "a font nobody asked for",
  "a robot that judges you", "a poem about the fridge", "your own constellation",
  "a board game for one player", "a zine about lifts", "a language with six words",
  "the world's slowest race", "a sculpture made of packaging", "a museum of one room",
  "an opera for two cups", "a flag for this afternoon",
];

const TWISTS = [
  "using only your left hand", "in under twenty minutes", "without touching a screen",
  "at three in the morning", "with things from the kitchen", "and explain it to a plant",
  "in complete silence", "for a total stranger", "then burn it", "backwards",
  "in one continuous take", "using only blue objects", "while humming one note",
  "and never show it to anyone", "twice, badly",
];

const FORTUNES = [
  "The stars suggest keeping it small.",
  "Something you abandoned wants finishing.",
  "Ask for help. The machine approves.",
  "Be slightly ridiculous. It's on the schedule.",
  "Do it badly first. That is the plan.",
  "Your future self is also bored. Help them.",
  "Put the phone in another room, then come back.",
];

const LENGTHS = [VERBS.length, SUBJECTS.length, TWISTS.length];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function Oracle() {
  const { nudge, track, addPlan, togglePlan, removePlan, clearPlan } = useBoredom();
  const plan = useStore((s) => s.plan);

  const [idx, setIdx] = useState([2, 1, 4]);
  const [locked, setLocked] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fortune, setFortune] = useState(FORTUNES[0]);

  const timers = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);
  const lockedRef = useRef([true, true, true]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      if (tickRef.current) window.clearInterval(tickRef.current);
    },
    [],
  );

  const current = `${VERBS[idx[0]]} ${SUBJECTS[idx[1]]} ${TWISTS[idx[2]]}`;

  const spin = () => {
    if (spinning) return;
    unlockAudio();
    setSpinning(true);
    lockedRef.current = [false, false, false];
    setLocked([false, false, false]);
    const finals = LENGTHS.map((n) => Math.floor(Math.random() * n));

    tickRef.current = window.setInterval(() => {
      setIdx((prev) =>
        prev.map((v, i) => (lockedRef.current[i] ? v : (v + 1 + Math.floor(Math.random() * 3)) % LENGTHS[i])),
      );
    }, 58);

    [560, 980, 1450].forEach((ms, i) => {
      const id = window.setTimeout(() => {
        lockedRef.current[i] = true;
        setIdx((prev) => prev.map((v, j) => (j === i ? finals[i] : v)));
        setLocked((prev) => prev.map((v, j) => (j === i ? true : v)));
        play("click", 900 + i * 300, { vol: 0.5 });
        if (i === 2) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          tickRef.current = null;
          setSpinning(false);
          setFortune(pick(FORTUNES));
          track("spins");
          nudge(2, "CONSULTED THE ORACLE");
        }
      }, ms);
      timers.current.push(id);
    });
  };

  const addToPlan = () => {
    addPlan(current);
    nudge(3, "COMMITTED");
  };

  const toggle = (id: number, wasDone: boolean) => {
    togglePlan(id);
    if (!wasDone) nudge(3, "DID A THING");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
      nudge(1, "COPIED");
    } catch {
      /* clipboard blocked, no big deal */
    }
  };

  const done = plan.filter((p) => p.done).length;

  return (
    <SectionShell
      id="oracle"
      index="05"
      kicker="decision-removal engine"
      title="Stop choosing. Let the machine pick."
      blurb="Half of boredom is decision fatigue wearing a disguise. Pull the lever, get an assignment, commit it to the plan. Your list survives a refresh, and every tick is recorded in the ledger. No excuses."
      accent="#b46bff"
      controls={
        <>
          <button
            className={cn("btn border-plum/70 bg-plum text-ink hover:bg-bone", spinning && "cursor-wait opacity-60")}
            onClick={spin}
            type="button"
          >
            {spinning ? "consulting…" : "⟳ pull the lever"}
          </button>
          <button className="btn" onClick={copy} type="button">
            {copied ? "copied ✓" : "copy"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden bg-bone px-5 py-8 text-ink sm:px-9 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#0f0c0b 0 1px,transparent 1px 26px),repeating-linear-gradient(0deg,#0f0c0b 0 1px,transparent 1px 26px)",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between font-mono text-[0.58rem] tracking-[0.24em] uppercase">
              <span className="text-ink/50">assignment № {String(plan.length + 1).padStart(3, "0")}</span>
              <span className={cn("flex items-center gap-1.5 text-ink/50", spinning && "text-coral")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", spinning ? "bg-coral blink" : "bg-ink/30")} />
                {spinning ? "computing" : "idle"}
              </span>
            </div>

            <div className="mt-5 space-y-1">
              {[
                { arr: VERBS, i: 0, cls: "text-[clamp(2rem,6vw,3.4rem)]" },
                { arr: SUBJECTS, i: 1, cls: "text-[clamp(1.6rem,4.6vw,2.6rem)]" },
                { arr: TWISTS, i: 2, cls: "text-[clamp(1.1rem,3vw,1.7rem)]" },
              ].map((reel) => (
                <div
                  key={reel.i}
                  className="overflow-hidden border-b border-ink/15 py-1.5"
                  style={{
                    WebkitMaskImage: "linear-gradient(90deg,transparent,#000 3%,#000 92%,transparent)",
                    maskImage: "linear-gradient(90deg,transparent,#000 3%,#000 92%,transparent)",
                  }}
                >
                  <div
                    className={cn(
                      "font-display leading-[1.05] font-extrabold tracking-tight transition-all duration-75",
                      reel.cls,
                      reel.i === 1 && "text-coral",
                      reel.i === 2 && "font-sans text-[clamp(0.95rem,2.2vw,1.15rem)] font-medium tracking-normal text-ink/70",
                      !locked[reel.i] && "blur-[1.5px] opacity-60",
                    )}
                  >
                    {reel.arr[idx[reel.i]]}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 min-h-[1.5em] font-display text-[0.95rem] text-ink/70">
              {spinning ? "…" : `“${fortune}”`}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addToPlan}
                disabled={spinning}
                className="btn border-ink bg-ink text-bone hover:bg-coral hover:border-coral hover:text-ink disabled:opacity-40"
              >
                + add to the plan
              </button>
              <span className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/50 uppercase">
                {spinning ? "wait for it…" : `"${current.toLowerCase()}"`}
              </span>
            </div>
          </div>
        </div>

        <div className="panel flex flex-col p-4">
          <div className="flex items-baseline justify-between border-b border-bone/10 pb-3">
            <span className="font-mono text-[0.6rem] tracking-[0.22em] text-ash uppercase">the plan</span>
            <span className="font-display text-[0.9rem] font-extrabold tabular-nums">
              {done}/{plan.length}
            </span>
          </div>

          {plan.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center">
              <p className="max-w-[24ch] font-mono text-[0.62rem] leading-relaxed tracking-[0.14em] text-ash uppercase">
                nothing here yet. the oracle is warming up.
              </p>
            </div>
          ) : (
            <ul className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 340 }}>
              {plan.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "group flex items-start gap-2.5 border p-2.5 transition-colors",
                    item.done ? "border-mint/30 bg-mint/5" : "border-bone/10 hover:border-bone/30",
                  )}
                >
                  <button
                    type="button"
                    aria-label="toggle done"
                    onClick={() => toggle(item.id, item.done)}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
                      item.done ? "border-mint bg-mint text-ink" : "border-bone/40 hover:border-bone",
                    )}
                  >
                    {item.done ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <path d="M4 12l6 6L20 6" />
                      </svg>
                    ) : null}
                  </button>
                  <span className={cn("flex-1 text-[0.86rem] leading-snug", item.done ? "text-ash line-through" : "text-bone")}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    aria-label="remove"
                    onClick={() => removePlan(item.id)}
                    className="font-mono text-[0.7rem] text-ash opacity-0 transition-opacity group-hover:opacity-100 hover:text-coral"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {plan.length > 0 ? (
            <button
              type="button"
              className="btn mt-3 w-full"
              onClick={() => {
                clearPlan();
                nudge(1, "WIPED THE PLAN");
              }}
            >
              tear up the list
            </button>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}
