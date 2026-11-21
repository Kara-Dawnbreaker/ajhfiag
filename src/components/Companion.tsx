import { useEffect, useRef, useState } from "react";
import { useBoredom, useStore } from "../lib/boredom";
import { play, unlockAudio } from "../lib/audio";

/** Lines keyed by the same labels the machines pass to nudge(). */
const QUIPS: Record<string, string[]> = {
  PAINTED: ["Ooh, a splatter. Art critics are weeping.", "That's a lot of colour for a Tuesday."],
  RESEEDED: ["New universe, who dis?"],
  CLEARED: ["Blank canvas. Terrifying. Thrilling."],
  "CLEARED LIFE": ["Empty grid. Pure potential."],
  "SAVED ART": ["Museum-ready. Probably."],
  PINNED: ["Gallery wall acquired."],
  RECOLOURED: ["Fresh palette. Bold choice."],
  "DROPPED A BEAT": ["Thump. Thump. You're a DJ now."],
  SEQUENCED: ["Tick. Tock. Tick."],
  "LOADED A GROOVE": ["Classic. Respect."],
  "ROLLED THE DICE": ["Chaos is a ladder."],
  MIXED: ["The mute button: the great silencer."],
  "STARTED A RUN": ["Hands up. Eyes wide. Go!"],
  "PLAYED THE ARCADE": ["Your thumbs have stories to tell."],
  COMBO: ["Combo! The machine is impressed. Slightly."],
  "FROZE TIME": ["Shh. Time is on a break."],
  COMMITTED: ["Look at you, committing. Brave."],
  "DID A THING": ["A real, actual thing. Ticked. Wow."],
  COPIED: ["Copied. Now go paste it somewhere fun."],
  "WIPED THE PLAN": ["Clean slate. Dangerous, exciting."],
  TUNED: ["Ah, the sweet sound of tweaking."],
  "LIFE SPARKED": ["Something is alive in there!"],
  "LIFE STEPPED": ["One tick closer to chaos."],
  "NEW RULE": ["New physics. Same you."],
  "SEEDED LIFE": ["Congratulations, you are a god of tiny squares."],
  "ERASED LIFE": ["Mass extinction, by hand. Brutal."],
  "LOADED SOUP": ["Primordial soup. Gloriously random."],
  "LOADED GLIDER": ["It glides. It always glides."],
  "LOADED PULSAR": ["Three-way symmetry. Show-off."],
  "LOADED GUN": ["Gliders incoming. Do not stand in the way."],
  POKED: ["Ow. Okay. That was fine.", "Hi, I'm PIP. I'm bored too.", "Boop."],
};

const IDLE = [
  "Still there? Nobody blames you.",
  "The ceiling is very interesting, I hear.",
  "Try the life organ. Pick the gun preset.",
  "Pro tip: space starts the arcade.",
  "No pressure. Boredom is a valid mood.",
];

const FALLBACK = ["Noted.", "The machine logs everything.", "Keep going."];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function Companion() {
  const ping = useStore((s) => s.ping);
  const toast = useStore((s) => s.toast);
  const lastNudge = useStore((s) => s.lastNudge);
  const stats = useStore((s) => s.stats);
  const latestLog = useStore((s) => s.log[s.log.length - 1] ?? null);
  const pipTier = stats.events >= 300 ? 3 : stats.events >= 100 ? 2 : stats.events >= 25 ? 1 : 0;
  const pipAccent = ["#35e39f", "#58b6ff", "#ffb020", "#b46bff"][pipTier];
  const { nudge } = useBoredom();

  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const hideRef = useRef<number | undefined>(undefined);
  const robotRef = useRef<HTMLButtonElement | null>(null);
  const pupilRef = useRef<SVGGElement | null>(null);
  const lastNudgeRef = useRef(lastNudge);
  const tierRef = useRef(pipTier);
  lastNudgeRef.current = lastNudge;

  const say = (text: string, ms = 3600) => {
    window.clearTimeout(hideRef.current);
    setLine({ text, id: Date.now() });
    hideRef.current = window.setTimeout(() => setLine(null), ms);
  };

  // Hello, once per visit.
  useEffect(() => {
    const t = window.setTimeout(() => say("Hi, I'm PIP. I'm bored too. Let's fix that."), 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to machine events.
  useEffect(() => {
    if (!ping) return;
    const opts = QUIPS[ping.label] ?? FALLBACK;
    say(pick(opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ping]);

  // PIP evolves as the whole machine gains experience.\n  useEffect(() => {\n    if (pipTier > tierRef.current) say(["", "PIP update! New sensors online.", "Look at me. I have evolved.", "Maximum PIP. I am basically the machine now."][pipTier], 4600);\n    tierRef.current = pipTier;\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [pipTier]);\n\n  // React when a hidden discovery is found.\n  useEffect(() => {\n    if (latestLog?.text.startsWith("discovery found")) say(`Secret discovered: ${latestLog.text.split("·").pop()?.trim()}. Nice work.`, 4600);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [latestLog?.id]);\n\n  // Celebrate badges.
  useEffect(() => {
    if (!toast) return;
    say(`badge unlocked: ${toast.title.toLowerCase()} ${toast.glyph}`, 4200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Get bored of waiting after a while.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastNudgeRef.current > 24000 && Math.random() < 0.5) say(pick(IDLE), 4200);
    }, 9000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pupils follow the pointer.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = robotRef.current;
      const pupils = pupilRef.current;
      if (!el || !pupils) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 220);
      pupils.style.transform = `translate(${(dx / d) * 2.6 * k}px, ${(dy / d) * 2 * k}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const poke = () => {
    unlockAudio();
    play("poke", 600, { vol: 0.5 });
    nudge(0.5, "POKED");
  };

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-[60] flex flex-col items-end gap-2 sm:right-5 sm:bottom-5">
      {line ? (
        <div
          key={line.id}
          role="status"
          aria-live="polite"
          className="pop-in max-w-[15rem] border border-bone/20 bg-ink/95 px-3 py-2 font-mono text-[0.66rem] leading-snug text-bone shadow-2xl sm:max-w-[18rem]"
        >
          {line.text}
        </div>
      ) : null}
      <button
        ref={robotRef}
        type="button"
        onClick={poke}
        aria-label="PIP, the boredom companion. Click to poke."
        className="pointer-events-auto companion-bob relative h-16 w-16 focus:outline-none"
      >
        <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]">
          <line x1="32" y1="8" x2="32" y2="14" stroke="#a2938a" strokeWidth="2" />
          <circle cx="32" cy="6" r="3.2" fill={pipAccent} className="blink" />
          <rect x="10" y="14" width="44" height="36" rx="11" fill="#1e1715" stroke="#f4ece0" strokeOpacity="0.25" />
          <rect x="16" y="21" width="32" height="20" rx="7" fill="#0f0c0b" />
          <g className="eye-blink">
            <circle cx="25" cy="31" r="5" fill={pipAccent} />
            <circle cx="39" cy="31" r="5" fill="#35e39f" />
          </g>
          <g ref={pupilRef} style={{ transition: "transform 0.1s linear" }}>
            <circle cx="25" cy="31" r="2" fill="#0f0c0b" />
            <circle cx="39" cy="31" r="2" fill="#0f0c0b" />
          </g>
          <rect x="22" y="46" width="20" height="3" rx="1.5" fill="#a2938a" opacity="0.6" />
          <rect x="14" y="50" width="8" height="6" rx="2" fill="#f4ece0" opacity="0.3" />
          <rect x="42" y="50" width="8" height="6" rx="2" fill="#f4ece0" opacity="0.3" />
        </svg>
      </button>
    </div>
  );
}
