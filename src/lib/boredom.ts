/* The shared store: boredom meter, lifetime stats, plan, gallery, log, badges.
 * Implemented as a tiny external store so only the components that read a
 * slice re-render when it changes. */
import { useSyncExternalStore } from "react";
import { BADGES, EMPTY_STATS, dareProgress, emptyDaily, pickDares, todayKey, type Daily, type Stats } from "./game";
import { play } from "./audio";

export type PlanItem = { id: number; text: string; done: boolean };
export type GalleryItem = { id: number; src: string; title: string; at: number };
export type LogItem = { id: number; t: number; text: string; tone: "info" | "good" | "warn" };
export type Float = { id: number; label: string; amount: number };
export type Toast = { id: number; title: string; sub: string; glyph: string; color: string };
export type Ping = { id: number; label: string };

export type State = {
  boredom: number;
  celebrate: boolean;
  floats: Float[];
  stats: Stats;
  daily: Daily;
  dareDayRecorded: string | null;
  plan: PlanItem[];
  gallery: GalleryItem[];
  log: LogItem[];
  runs: number[];
  unlocked: string[];
  toast: Toast | null;
  ping: Ping | null;
  lastNudge: number;
};

const CORE_KEY = "bm.v2.core";
const GAL_KEY = "bm.v2.gallery";
const LOG_CAP = 40;
const PLAN_CAP = 12;
const GAL_CAP = 8;
const RUN_CAP = 8;

let seq = 0;
const nid = () => Date.now() * 100 + (seq++ % 100);

function freshState(): State {
  return {
    boredom: 100,
    celebrate: false,
    floats: [],
    stats: { ...EMPTY_STATS },
    daily: emptyDaily(todayKey()),
    dareDayRecorded: null,
    plan: [],
    gallery: [],
    log: [],
    runs: [],
    unlocked: [],
    toast: null,
    ping: null,
    lastNudge: 0,
  };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function load(): State {
  const s = freshState();
  const core = readJSON<Partial<State> | null>(CORE_KEY, null);
  if (core) {
    s.stats = { ...EMPTY_STATS, ...(core.stats ?? {}) };
    s.plan = core.plan ?? [];
    s.log = (core.log ?? []).slice(-LOG_CAP);
    s.runs = core.runs ?? [];
    s.unlocked = core.unlocked ?? [];
    s.dareDayRecorded = core.dareDayRecorded ?? null;
    if (core.daily && core.daily.date === todayKey()) s.daily = core.daily;
  } else {
    // Migrate the first prototype's keys so an existing player keeps their progress.
    s.stats.arcadeBest = readJSON<number>("bm.best", 0) || 0;
    s.plan = readJSON<PlanItem[]>("bm.plan", []);
  }
  s.gallery = readJSON<GalleryItem[]>(GAL_KEY, []);
  return s;
}

let state: State = load();
const subs = new Set<() => void>();
let saveTimer: number | undefined;

function persistCore() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(
        CORE_KEY,
        JSON.stringify({
          stats: state.stats,
          daily: state.daily,
          dareDayRecorded: state.dareDayRecorded,
          plan: state.plan,
          log: state.log,
          runs: state.runs,
          unlocked: state.unlocked,
        }),
      );
    } catch {
      /* storage blocked or full */
    }
  }, 250);
}

function pushLog(log: LogItem[], text: string, tone: LogItem["tone"] = "info"): LogItem[] {
  return [...log, { id: nid(), t: Date.now(), text, tone }].slice(-LOG_CAP);
}

/** Returns the daily counters, starting fresh if the day has changed. */
function bump(daily: Daily, key: string, n: number): Daily {
  const d = daily.date === todayKey() ? daily : emptyDaily(todayKey());
  return { ...d, counters: { ...d.counters, [key]: (d.counters[key] ?? 0) + n } };
}

function commit(fn: (s: State) => State) {
  let next = fn(state);
  if (next === state) return;

  // Daily dares: award the "all clear" once per day.
  const today = next.daily.date;
  const dares = pickDares(today);
  if (
    today === todayKey() &&
    next.dareDayRecorded !== today &&
    dares.every((d) => dareProgress(d, next.daily) >= d.target)
  ) {
    next = {
      ...next,
      dareDayRecorded: today,
      stats: { ...next.stats, dareDays: next.stats.dareDays + 1 },
      log: pushLog(next.log, "all three daily dares cleared", "good"),
      toast: { id: nid(), title: "Dares cleared", sub: "Three for three. New ones at midnight.", glyph: "★", color: "#ff5f45" },
    };
  }

  // Badges.
  const fresh = BADGES.filter((b) => !next.unlocked.includes(b.id) && next.stats[b.key] >= b.target);
  if (fresh.length) {
    const b = fresh[0];
    next = {
      ...next,
      unlocked: [...next.unlocked, ...fresh.map((f) => f.id)],
      toast: { id: nid(), title: b.name, sub: b.blurb, glyph: b.glyph, color: b.color },
      log: fresh.reduce((l, f) => pushLog(l, `badge · ${f.name}`, "good"), next.log),
    };
    play("unlock");
  }

  // Gallery lives under its own key, since thumbnails are large.
  if (next.gallery !== state.gallery) {
    try {
      localStorage.setItem(GAL_KEY, JSON.stringify(next.gallery));
    } catch {
      next = { ...next, log: pushLog(next.log, "gallery is full, unpin something", "warn") };
    }
  }

  state = next;
  persistCore();
  subs.forEach((f) => f());
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};

/** Subscribe to a slice of the store. Keep selectors returning stable references. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

function nudge(amount: number, label = "") {
  commit((s) => {
    const boredom = Math.max(0, Math.round((s.boredom - amount) * 10) / 10);
    let next: State = {
      ...s,
      boredom,
      lastNudge: Date.now(),
      stats: { ...s.stats, events: s.stats.events + 1 },
      daily: bump(s.daily, "events", 1),
    };
    if (label) {
      next = { ...next, ping: { id: nid(), label }, log: pushLog(next.log, label.toLowerCase()) };
      if (amount > 0) {
        const id = nid();
        next = { ...next, floats: [...next.floats.slice(-4), { id, label, amount }] };
        window.setTimeout(() => commit((x) => ({ ...x, floats: x.floats.filter((f) => f.id !== id) })), 1000);
      }
    }
    if (amount > 0 && s.boredom > 0 && boredom === 0) {
      next = {
        ...next,
        celebrate: true,
        stats: { ...next.stats, cures: next.stats.cures + 1 },
        log: pushLog(next.log, "boredom cured", "good"),
      };
      window.setTimeout(() => commit((x) => ({ ...x, celebrate: false })), 3200);
    }
    return next;
  });
}

function reset() {
  commit((s) => ({ ...s, boredom: 100, floats: [], celebrate: false }));
}

function track(key: keyof Stats, n = 1) {
  commit((s) => ({
    ...s,
    stats: { ...s.stats, [key]: s.stats[key] + n },
    daily: bump(s.daily, key, n),
  }));
}

/** For best-value stats such as the arcade high score. */
function trackMax(key: keyof Stats, value: number) {
  commit((s) => {
    const daily = s.daily.date === todayKey() ? s.daily : emptyDaily(todayKey());
    const prevDaily = daily.maxes[key] ?? 0;
    const prevStat = s.stats[key];
    if (daily === s.daily && value <= prevStat && value <= prevDaily) return s;
    return {
      ...s,
      stats: { ...s.stats, [key]: Math.max(prevStat, value) },
      daily: { ...daily, maxes: { ...daily.maxes, [key]: Math.max(prevDaily, value) } },
    };
  });
}

function logRun(score: number) {
  commit((s) => ({ ...s, runs: [...s.runs, score].slice(-RUN_CAP) }));
}

function logLine(text: string, tone: LogItem["tone"] = "info") {
  commit((s) => ({ ...s, log: pushLog(s.log, text, tone) }));
}

function addPlan(text: string) {
  commit((s) => ({
    ...s,
    plan: [{ id: nid(), text, done: false }, ...s.plan].slice(0, PLAN_CAP),
    stats: { ...s.stats, committed: s.stats.committed + 1 },
    daily: bump(s.daily, "committed", 1),
    log: pushLog(s.log, `committed · ${text.toLowerCase()}`),
  }));
}

function togglePlan(id: number) {
  commit((s) => {
    const item = s.plan.find((p) => p.id === id);
    if (!item) return s;
    const becoming = !item.done;
    return {
      ...s,
      plan: s.plan.map((p) => (p.id === id ? { ...p, done: becoming } : p)),
      stats: becoming ? { ...s.stats, tasksDone: s.stats.tasksDone + 1 } : s.stats,
      daily: becoming ? bump(s.daily, "tasksDone", 1) : s.daily,
      log: becoming ? pushLog(s.log, `done · ${item.text.toLowerCase()}`, "good") : s.log,
    };
  });
}

function removePlan(id: number) {
  commit((s) => ({ ...s, plan: s.plan.filter((p) => p.id !== id) }));
}

function clearPlan() {
  commit((s) => ({ ...s, plan: [] }));
}

function pinImage(src: string, title: string) {
  commit((s) => ({
    ...s,
    gallery: [...s.gallery, { id: nid(), src, title, at: Date.now() }].slice(-GAL_CAP),
    stats: { ...s.stats, pinned: s.stats.pinned + 1 },
    daily: bump(s.daily, "pinned", 1),
    log: pushLog(s.log, `pinned · ${title}`, "good"),
  }));
}

function unpin(id: number) {
  commit((s) => ({ ...s, gallery: s.gallery.filter((g) => g.id !== id) }));
}

function wipe() {
  window.clearTimeout(saveTimer);
  try {
    localStorage.removeItem(CORE_KEY);
    localStorage.removeItem(GAL_KEY);
  } catch {
    /* ignore */
  }
  state = freshState();
  subs.forEach((f) => f());
}

export const actions = {
  nudge,
  reset,
  track,
  trackMax,
  logRun,
  logLine,
  addPlan,
  togglePlan,
  removePlan,
  clearPlan,
  pinImage,
  unpin,
  wipe,
};

/** Stable action object. Calling this never subscribes the component to state. */
export const useBoredom = () => actions;

let clockStarted = false;
let ticks = 0;

/** Every five seconds: count visible time, roll the day over, and let boredom creep back when idle. */
export function startClock() {
  if (clockStarted || typeof window === "undefined") return;
  clockStarted = true;
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    ticks += 5;
    commit((s) => {
      const today = todayKey();
      const daily = s.daily.date === today ? s.daily : emptyDaily(today);
      const idle = Date.now() - s.lastNudge > 8000;
      const creep = ticks % 15 === 0 && idle && s.boredom < 100;
      return {
        ...s,
        daily,
        stats: { ...s.stats, seconds: s.stats.seconds + 5 },
        boredom: creep ? Math.min(100, s.boredom + 1) : s.boredom,
      };
    });
  }, 5000);
}
