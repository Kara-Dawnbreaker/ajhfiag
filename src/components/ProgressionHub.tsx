import { useEffect, useMemo, useState } from "react";
import { useBoredom, useStore } from "../lib/boredom";
import { dareProgress, pickDares, todayKey, type Stats } from "../lib/game";
import { usePersistentState } from "../lib/hooks";
import { cn } from "../utils/cn";

const STATIONS = [
  { id: "flow", name: "Flow Studio", href: "#flow", task: "make a paint burst", metric: "bursts" as const },
  { id: "beat", name: "Beat Machine", href: "#beat", task: "drop a beat", metric: "beats" as const },
  { id: "reflex", name: "Reflex Arcade", href: "#reflex", task: "play an arcade run", metric: "arcadeRuns" as const },
  { id: "life", name: "Life Organ", href: "#life", task: "grow a living pattern", metric: "gens" as const },
];

const DISCOVERIES = [
  { id: "fourfold", name: "Fourfold Mind", hint: "Try every station at least once.", test: (s: Stats) => s.bursts > 0 && s.beats > 0 && s.arcadeRuns > 0 && s.gens > 0 },
  { id: "curator", name: "Curator's Eye", hint: "Pin three creations in your museum.", test: (s: Stats) => s.pinned >= 3 },
  { id: "sound-and-life", name: "Living Sound", hint: "Make the Life Organ sing and build a beat.", test: (s: Stats) => s.notes >= 40 && s.beats >= 10 },
  { id: "long-haul", name: "Time Traveller", hint: "Spend 30 minutes exploring the Machine.", test: (s: Stats) => s.seconds >= 1800 },
  { id: "restless", name: "Restless Curiosity", hint: "Reach 100 interactions across the stations.", test: (s: Stats) => s.events >= 100 },
  { id: "full-spectrum", name: "Full Spectrum", hint: "Create, play, grow, and score.", test: (s: Stats) => s.bursts >= 10 && s.beats >= 25 && s.gens >= 100 && s.arcadeBest >= 150 },
];

function mondayKey() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return todayKey(d);
}

function totalXp(s: Stats) {
  return s.events + s.bursts * 3 + s.beats * 2 + s.arcadeRuns * 8 + s.gens / 5 + s.pinned * 12 + s.notes / 10;
}

function meter(value: number, target: number) {
  return Math.min(100, (value / target) * 100);
}

export default function ProgressionHub() {
  const stats = useStore((s) => s.stats);
  const daily = useStore((s) => s.daily);
  const gallery = useStore((s) => s.gallery);
  const { logLine } = useBoredom();
  const [found, setFound] = usePersistentState<string[]>("bm.v3.discoveries", []);
  const [theme, setTheme] = usePersistentState<string>("bm.v3.theme", "midnight");
  const [week, setWeek] = usePersistentState<{ key: string; baseline: Stats }>("bm.v3.week", { key: mondayKey(), baseline: stats });
  const [randomPick, setRandomPick] = useState<{ station: typeof STATIONS[number]; prompt: string } | null>(null);

  const xp = Math.floor(totalXp(stats) + found.length * 30);
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 35)) + 1);
  const dares = pickDares(daily.date);
  const weeklyTasks = [
    { id: "week-flow", label: "Create 12 paint bursts", key: "bursts" as const, target: 12 },
    { id: "week-beat", label: "Drop 30 beats", key: "beats" as const, target: 30 },
    { id: "week-arcade", label: "Finish 5 arcade runs", key: "arcadeRuns" as const, target: 5 },
    { id: "week-life", label: "Grow 250 generations", key: "gens" as const, target: 250 },
  ];

  useEffect(() => {
    const key = mondayKey();
    if (week.key !== key) setWeek({ key, baseline: stats });
  }, [week.key, stats, setWeek]);

  useEffect(() => {
    const fresh = DISCOVERIES.filter((d) => !found.includes(d.id) && d.test(stats));
    if (!fresh.length) return;
    setFound((old) => [...old, ...fresh.map((d) => d.id)]);
    fresh.forEach((d) => logLine(`discovery found · ${d.name}`, "good"));
  }, [stats, found, setFound, logLine]);

  useEffect(() => {
    document.documentElement.dataset.machineTheme = theme;
    return () => { delete document.documentElement.dataset.machineTheme; };
  }, [theme]);

  const mastery = useMemo(() => [
    { name: "Flow", value: stats.bursts, target: 50 },
    { name: "Beat", value: stats.beats, target: 100 },
    { name: "Reflex", value: stats.arcadeBest, target: 500 },
    { name: "Life", value: stats.gens, target: 1000 },
  ], [stats]);

  const unlockedThemes = [
    { id: "midnight", name: "Midnight", level: 1, description: "Original machine palette" },
    { id: "ember", name: "Ember", level: 3, description: "Warm furnace tones" },
    { id: "deep-sea", name: "Deep Sea", level: 6, description: "Cool ocean colours" },
  ];
  const missionsDone = dares.filter((d) => dareProgress(d, daily) >= d.target).length;
  const weeklyProgress = (key: keyof Stats) => Math.max(0, stats[key] - (week.baseline[key] ?? 0));

  const chooseRandom = () => {
    const station = STATIONS[Math.floor(Math.random() * STATIONS.length)];
    const prompts = [
      `Visit ${station.name} and ${station.task}.`,
      `Spend two minutes in ${station.name} without repeating your usual pattern.`,
      `Make one small experiment in ${station.name}, then try a different station.`,
    ];
    setRandomPick({ station, prompt: prompts[Math.floor(Math.random() * prompts.length)] });
  };

  return (
    <div className="panel mt-4 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-bone/10 p-5">
        <div>
          <div className="font-mono text-[0.58rem] tracking-[0.22em] text-mint uppercase">the machine-wide system</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Your progress has a pulse.</h2>
          <p className="mt-1 max-w-2xl text-sm text-ash">Every station feeds one shared profile. Discover secrets, build mastery, collect themes, and give PIP something to be proud of.</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[0.55rem] tracking-[0.2em] text-ash uppercase">machine level</div>
          <div className="font-display text-4xl font-extrabold text-amber">{level}</div>
          <div className="font-mono text-[0.55rem] text-ash">{xp.toLocaleString()} XP</div>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <section className="border border-bone/10 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs tracking-[0.16em] text-amber uppercase">daily experiment</h3>
            <span className="font-mono text-[0.58rem] text-ash">{daily.date}</span>
          </div>
          <div className="mt-1 text-sm text-ash">{missionsDone}/3 challenges completed today</div>
          <div className="mt-3 h-1.5 bg-bone/10"><div className="h-full bg-amber transition-all" style={{ width: `${(missionsDone / 3) * 100}%` }} /></div>
          <ul className="mt-3 space-y-2">
            {dares.map((d) => {
              const value = dareProgress(d, daily);
              const done = value >= d.target;
              return <li key={d.id} className="flex items-center gap-2 text-sm">
                <span className={cn("w-4 text-center", done ? "text-mint" : "text-ash")}>{done ? "✓" : "○"}</span>
                <span className={cn("flex-1", done && "text-ash line-through")}>{d.text}</span>
                <span className="font-mono text-[0.58rem] text-ash">{Math.min(value, d.target)}/{d.target}</span>
              </li>;
            })}
          </ul>
        </section>

        <section className="border border-bone/10 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs tracking-[0.16em] text-sky uppercase">weekly missions</h3>
            <span className="font-mono text-[0.58rem] text-ash">week of {week.key}</span>
          </div>
          <ul className="mt-3 space-y-3">
            {weeklyTasks.map((task) => {
              const value = weeklyProgress(task.key);
              const done = value >= task.target;
              return <li key={task.id}>
                <div className="flex justify-between gap-2 text-sm"><span>{task.label}</span><span className="font-mono text-xs text-ash">{Math.min(value, task.target)}/{task.target}</span></div>
                <div className="mt-1 h-1 bg-bone/10"><div className="h-full bg-sky transition-all" style={{ width: `${meter(value, task.target)}%` }} /></div>
              </li>;
            })}
          </ul>
        </section>

        <section className="border border-bone/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-xs tracking-[0.16em] text-coral uppercase">secret discoveries</h3>
            <span className="font-mono text-[0.58rem] text-ash">{found.length}/{DISCOVERIES.length} found</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DISCOVERIES.map((d) => {
              const got = found.includes(d.id);
              return <div key={d.id} className={cn("border p-3", got ? "border-mint/40 bg-mint/[0.05]" : "border-dashed border-bone/15")}>
                <div className="font-display text-sm font-bold">{got ? "✦ " + d.name : "??? hidden record"}</div>
                <p className="mt-1 text-xs leading-relaxed text-ash">{got ? d.hint : "A secret is waiting somewhere in the Machine."}</p>
              </div>;
            })}
          </div>
        </section>

        <section className="border border-bone/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-xs tracking-[0.16em] text-plum uppercase">station mastery</h3>
            <span className="font-mono text-[0.58rem] text-ash">earned through play</span>
          </div>
          <div className="mt-3 space-y-3">
            {mastery.map((m) => {
              const tier = Math.min(5, Math.floor(m.value / m.target * 5));
              return <div key={m.name}>
                <div className="flex justify-between text-sm"><span>{m.name}</span><span className="font-mono text-[0.58rem] text-ash">rank {tier + 1}/6</span></div>
                <div className="mt-1 h-1 bg-bone/10"><div className="h-full bg-plum" style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} /></div>
              </div>;
            })}
          </div>
        </section>

        <section className="border border-bone/10 p-4">
          <h3 className="font-mono text-xs tracking-[0.16em] text-mint uppercase">randomizer · break the routine</h3>
          <p className="mt-1 text-xs text-ash">Let the Machine pick a station and give you a tiny mission.</p>
          <button type="button" className="btn mt-3" onClick={chooseRandom}>surprise me ↗</button>
          {randomPick && <div className="mt-3 border-l-2 border-amber bg-bone/[0.04] p-3">
            <div className="font-display font-bold">{randomPick.station.name}</div>
            <p className="mt-1 text-sm text-ash">{randomPick.prompt}</p>
            <a className="mt-3 inline-block font-mono text-xs text-amber underline underline-offset-4" href={randomPick.station.href}>go to station ↗</a>
          </div>}
        </section>

        <section className="border border-bone/10 p-4">
          <h3 className="font-mono text-xs tracking-[0.16em] text-amber uppercase">unlocked machine themes</h3>
          <p className="mt-1 text-xs text-ash">Reach a level to unlock a new atmosphere. Your choice is saved on this device.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unlockedThemes.map((t) => {
              const open = level >= t.level;
              return <button key={t.id} type="button" disabled={!open} onClick={() => setTheme(t.id)} title={t.description} className={cn("btn", theme === t.id && "border-amber bg-amber/15 text-amber", !open && "opacity-40")}>{open ? t.name : `🔒 Lv.${t.level}`}</button>;
            })}
          </div>
        </section>

        <section className="border border-bone/10 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-xs tracking-[0.16em] text-bone uppercase">personal statistics</h3>
            <span className="font-mono text-[0.58rem] text-ash">all stations · lifetime</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["time explored", `${Math.floor(stats.seconds / 60)}m`],
              ["interactions", stats.events.toLocaleString()],
              ["creations pinned", gallery.length.toLocaleString()],
              ["best arcade score", stats.arcadeBest.toLocaleString()],
              ["beats dropped", stats.beats.toLocaleString()],
              ["life generations", stats.gens.toLocaleString()],
              ["paint bursts", stats.bursts.toLocaleString()],
              ["notes played", stats.notes.toLocaleString()],
            ].map(([label, value]) => <div key={label} className="bg-bone/[0.035] p-3">
              <div className="font-display text-xl font-extrabold text-bone">{value}</div>
              <div className="mt-1 font-mono text-[0.52rem] tracking-[0.12em] text-ash uppercase">{label}</div>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
