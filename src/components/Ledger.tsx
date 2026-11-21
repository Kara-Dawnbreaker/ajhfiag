import SectionShell from "./SectionShell";
import ProgressionHub from "./ProgressionHub";
import { useBoredom, useStore } from "../lib/boredom";
import { BADGES, dareProgress, formatDuration, pickDares } from "../lib/game";
import { cn } from "../utils/cn";

function exportRecord(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boredom-ledger-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fmtStat = (key: string, n: number) => (key === "seconds" ? formatDuration(n) : n.toLocaleString());

export default function Ledger() {
  const daily = useStore((s) => s.daily);
  const stats = useStore((s) => s.stats);
  const unlocked = useStore((s) => s.unlocked);
  const gallery = useStore((s) => s.gallery);
  const log = useStore((s) => s.log);
  const plan = useStore((s) => s.plan);
  const runs = useStore((s) => s.runs);
  const boredom = useStore((s) => s.boredom);
  const awarded = useStore((s) => s.dareDayRecorded === s.daily.date);
  const { unpin, wipe } = useBoredom();

  const dares = pickDares(daily.date);
  const cleared = dares.every((d) => dareProgress(d, daily) >= d.target);
  const recent = log.slice(-14).reverse();

  const wipeAll = () => {
    if (window.confirm("Wipe your whole record? Badges, gallery, plan and stats all go.")) wipe();
  };

  const doExport = () =>
    exportRecord({
      exportedAt: new Date().toISOString(),
      stats,
      boredom,
      daily,
      badges: unlocked,
      gallery,
      plan,
      arcadeRuns: runs,
      log,
    });

  return (
    <SectionShell
      id="ledger"
      index="05"
      kicker="your permanent record"
      title="The ledger remembers everything."
      blurb="Daily dares reset at midnight. Badges, gallery and stats don't. Every interaction on this page lands here, timestamped, like a machine that keeps score of your procrastination."
      accent="#35e39f"
      controls={
        <>
          <button className="btn" onClick={doExport} type="button">
            export json
          </button>
          <button className="btn" onClick={wipeAll} type="button">
            wipe record
          </button>
        </>
      }
    >
      <ProgressionHub />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Daily dares */}
        <div className="panel relative overflow-hidden p-5">
          <div className="flex items-baseline justify-between gap-3 border-b border-bone/10 pb-3">
            <span className="font-mono text-[0.6rem] tracking-[0.22em] text-ash uppercase">today's dares</span>
            <span className="font-mono text-[0.58rem] tracking-[0.14em] text-ash/70 uppercase">{daily.date}</span>
          </div>
          <ul className="mt-3 space-y-3">
            {dares.map((d) => {
              const cur = dareProgress(d, daily);
              const done = cur >= d.target;
              const pct = Math.min(100, (cur / d.target) * 100);
              return (
                <li key={d.id} className="border-b border-bone/10 pb-3 last:border-0">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border",
                        done ? "border-mint bg-mint text-ink" : "border-bone/35",
                      )}
                    >
                      {done ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <path d="M4 12l6 6L20 6" />
                        </svg>
                      ) : null}
                    </span>
                    <div className="flex-1">
                      <div className={cn("text-[0.9rem] leading-snug", done && "text-ash line-through")}>{d.text}</div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1 flex-1 bg-bone/10">
                          <div
                            className="h-full transition-[width] duration-500"
                            style={{ width: `${pct}%`, background: done ? "#35e39f" : "#ffb020" }}
                          />
                        </div>
                        <span className="font-mono text-[0.6rem] tracking-[0.08em] text-ash tabular-nums">
                          {d.kind === "max" ? "best " : ""}
                          {Math.min(cur, d.target)}/{d.target}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 font-mono text-[0.58rem] tracking-[0.12em] text-ash uppercase">
            {awarded ? "all clear recorded · +1 dare day" : cleared ? "all clear · recording…" : "clear all three for a dare day"}
          </p>
          {cleared ? (
            <div className="stamp-in pointer-events-none absolute top-5 right-5 rotate-[-6deg] border-2 border-mint px-3 py-1 font-display text-lg font-extrabold tracking-[0.2em] text-mint">
              ALL CLEAR
            </div>
          ) : null}
        </div>

        {/* Badges */}
        <div className="panel p-5">
          <div className="flex items-baseline justify-between border-b border-bone/10 pb-3">
            <span className="font-mono text-[0.6rem] tracking-[0.22em] text-ash uppercase">badges</span>
            <span className="font-display text-[0.95rem] font-extrabold tabular-nums">
              {unlocked.length}/{BADGES.length}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {BADGES.map((b) => {
              const got = unlocked.includes(b.id);
              const cur = Math.min(stats[b.key], b.target);
              const pct = (cur / b.target) * 100;
              return (
                <div
                  key={b.id}
                  title={b.blurb}
                  className={cn(
                    "flex flex-col items-center gap-1.5 border p-2 text-center transition-all",
                    got ? "border-bone/25 bg-bone/[0.04]" : "border-dashed border-bone/12 opacity-55",
                  )}
                >
                  <div
                    className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-base", got && "stamp-in")}
                    style={{
                      borderColor: got ? b.color : "rgba(244,236,224,0.2)",
                      color: got ? b.color : "#a2938a",
                      boxShadow: got ? `0 0 18px -4px ${b.color}` : undefined,
                    }}
                  >
                    {b.glyph}
                  </div>
                  <div className="font-display text-[0.7rem] leading-tight font-extrabold">{b.name}</div>
                  {got ? (
                    <div className="font-mono text-[0.48rem] tracking-[0.12em] text-mint uppercase">unlocked</div>
                  ) : (
                    <>
                      <div className="font-mono text-[0.48rem] tracking-[0.06em] text-ash tabular-nums">
                        {fmtStat(b.key, cur)} / {fmtStat(b.key, b.target)}
                      </div>
                      <div className="h-0.5 w-full bg-bone/10">
                        <div className="h-full bg-bone/50" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gallery */}
        <div className="panel p-5">
          <div className="flex items-baseline justify-between border-b border-bone/10 pb-3">
            <span className="font-mono text-[0.6rem] tracking-[0.22em] text-ash uppercase">gallery · pinned paintings</span>
            <span className="font-display text-[0.95rem] font-extrabold tabular-nums">{gallery.length}/8</span>
          </div>
          {gallery.length === 0 ? (
            <p className="py-10 text-center font-mono text-[0.62rem] leading-relaxed tracking-[0.14em] text-ash uppercase">
              nothing pinned yet.
              <br />
              create something in the flow field, then hit pin.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {gallery.map((g) => (
                <figure key={g.id} className="group relative border border-bone/12 bg-ink">
                  <img src={g.src} alt={g.title} className="aspect-[480/290] w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-2 border-t border-bone/10 px-2 py-1.5">
                    <span className="truncate font-mono text-[0.52rem] tracking-[0.1em] text-ash uppercase">{g.title}</span>
                    <span className="flex shrink-0 gap-2 font-mono text-[0.52rem] uppercase">
                      <a href={g.src} download={`flow-${g.id}.jpg`} className="text-bone hover:text-amber">
                        save
                      </a>
                      <button type="button" onClick={() => unpin(g.id)} className="text-ash hover:text-coral">
                        ✕
                      </button>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        {/* Log */}
        <div className="panel p-5">
          <div className="flex items-baseline justify-between border-b border-bone/10 pb-3">
            <span className="font-mono text-[0.6rem] tracking-[0.22em] text-ash uppercase">machine log</span>
            <span className="font-mono text-[0.55rem] tracking-[0.14em] text-ash uppercase">live</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-10 text-center font-mono text-[0.62rem] tracking-[0.14em] text-ash uppercase">
              the log is empty. touch something.
            </p>
          ) : (
            <ol className="mt-2 divide-y divide-bone/[0.06] font-mono text-[0.66rem]">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-[4.2rem] shrink-0 text-ash/70 tabular-nums">
                    {new Date(l.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: l.tone === "good" ? "#35e39f" : l.tone === "warn" ? "#ff5f45" : "#a2938a",
                    }}
                  />
                  <span className={cn("truncate", l.tone === "good" ? "text-mint" : l.tone === "warn" ? "text-coral" : "text-bone/85")}>
                    {l.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
