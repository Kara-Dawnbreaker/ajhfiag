/* Shared game rules: lifetime stats, daily dares, and permanent badges. */

export type Stats = {
  events: number;
  bursts: number;
  pinned: number;
  beats: number;
  starsPlanted: number;
  orbits: number;
  arcadeRuns: number;
  arcadeBest: number;
  arcadeHits: number;
  freezes: number;
  spins: number;
  committed: number;
  tasksDone: number;
  gens: number;
  notes: number;
  cures: number;
  seconds: number;
  dareDays: number;
};

export const EMPTY_STATS: Stats = {
  events: 0,
  bursts: 0,
  pinned: 0,
  beats: 0,
  starsPlanted: 0,
  orbits: 0,
  arcadeRuns: 0,
  arcadeBest: 0,
  arcadeHits: 0,
  freezes: 0,
  spins: 0,
  committed: 0,
  tasksDone: 0,
  gens: 0,
  notes: 0,
  cures: 0,
  seconds: 0,
  dareDays: 0,
};

/** Counters that reset every local day. */
export type Daily = {
  date: string;
  counters: Record<string, number>;
  maxes: Record<string, number>;
};

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyDaily(date: string): Daily {
  return { date, counters: {}, maxes: {} };
}

export type Dare = {
  id: string;
  text: string;
  key: keyof Stats;
  /** "count" adds up over the day, "max" tracks a best value. */
  kind: "count" | "max";
  target: number;
};

export const DARE_POOL: Dare[] = [
  { id: "bursts4", text: "Detonate 4 paint bursts in the flow field", key: "bursts", kind: "count", target: 4 },
  { id: "stars2", text: "Plant 2 stars in the gravity well", key: "starsPlanted", kind: "count", target: 2 },
  { id: "beats3", text: "Drop 3 beats in the sequencer", key: "beats", kind: "count", target: 3 },
  { id: "arc250", text: "Score 250 in a single arcade run", key: "arcadeBest", kind: "max", target: 250 },
  { id: "arcRuns2", text: "Finish 2 arcade runs", key: "arcadeRuns", kind: "count", target: 2 },
  { id: "spins3", text: "Pull the oracle lever 3 times", key: "spins", kind: "count", target: 3 },
  { id: "commit2", text: "Commit 2 assignments to the plan", key: "committed", kind: "count", target: 2 },
  { id: "done1", text: "Tick off one assignment", key: "tasksDone", kind: "count", target: 1 },
  { id: "gens25", text: "Watch 25 generations of life unfold", key: "gens", kind: "count", target: 25 },
  { id: "pin1", text: "Pin a painting to the gallery", key: "pinned", kind: "count", target: 1 },
  { id: "freeze1", text: "Freeze time in the arcade", key: "freezes", kind: "count", target: 1 },
  { id: "ev15", text: "Fiddle with things 15 times", key: "events", kind: "count", target: 15 },
  { id: "notes40", text: "Make the life organ sing 40 notes", key: "notes", kind: "count", target: 40 },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same date always yields the same three dares, so refreshing never reshuffles them. */
export function pickDares(date: string): Dare[] {
  const rnd = mulberry32(hash(date));
  const pool = [...DARE_POOL];
  const out: Dare[] = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(rnd() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function dareProgress(d: Dare, daily: Daily): number {
  if (d.kind === "max") return daily.maxes[d.key] ?? 0;
  return daily.counters[d.key] ?? 0;
}

export type Badge = {
  id: string;
  name: string;
  glyph: string;
  blurb: string;
  key: keyof Stats;
  target: number;
  color: string;
};

export const BADGES: Badge[] = [
  { id: "first", name: "First Fiddle", glyph: "●", blurb: "Touch anything on the page.", key: "events", target: 1, color: "#f4ece0" },
  { id: "splatter", name: "Splatter", glyph: "✦", blurb: "Detonate 10 paint bursts.", key: "bursts", target: 10, color: "#ffb020" },
  { id: "metronome", name: "Metronome", glyph: "▲", blurb: "Drop 25 beats.", key: "beats", target: 25, color: "#ff5f45" },
  { id: "gravitas", name: "Gravitas", glyph: "◆", blurb: "Plant 9 stars.", key: "starsPlanted", target: 9, color: "#35e39f" },
  { id: "orrery", name: "Orrery", glyph: "◉", blurb: "Build 3 solar systems.", key: "orbits", target: 3, color: "#35e39f" },
  { id: "reflex", name: "Reflex", glyph: "✺", blurb: "Score 250 in one arcade run.", key: "arcadeBest", target: 250, color: "#58b6ff" },
  { id: "frozen", name: "Frozen Moment", glyph: "✱", blurb: "Freeze time 3 times in the arcade.", key: "freezes", target: 3, color: "#8fe3ff" },
  { id: "lever", name: "Lever Puller", glyph: "◐", blurb: "Pull the oracle 10 times.", key: "spins", target: 10, color: "#b46bff" },
  { id: "commitment", name: "Commitment", glyph: "▣", blurb: "Commit 5 assignments to the plan.", key: "committed", target: 5, color: "#b46bff" },
  { id: "lifeform", name: "Life Form", glyph: "◎", blurb: "Watch 300 generations unfold.", key: "gens", target: 300, color: "#ff8fd0" },
  { id: "conductor", name: "Conductor", glyph: "♪", blurb: "Play 200 notes on the life organ.", key: "notes", target: 200, color: "#ff8a5c" },
  { id: "cured", name: "Cured", glyph: "✚", blurb: "Drain the boredom meter to zero.", key: "cures", target: 1, color: "#35e39f" },
  { id: "curator", name: "Curator", glyph: "◧", blurb: "Pin 3 paintings to the gallery.", key: "pinned", target: 3, color: "#ffb020" },
  { id: "devil", name: "Dare Devil", glyph: "★", blurb: "Clear all three daily dares in one day.", key: "dareDays", target: 1, color: "#ff5f45" },
  { id: "hour", name: "Hour Lost", glyph: "◷", blurb: "Waste an hour of visible time.", key: "seconds", target: 3600, color: "#58b6ff" },
];

export function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
