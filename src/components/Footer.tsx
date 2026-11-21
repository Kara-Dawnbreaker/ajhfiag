import { useStore } from "../lib/boredom";
import { BADGES, formatDuration } from "../lib/game";

export default function Footer() {
  const boredom = useStore((s) => s.boredom);
  const stats = useStore((s) => s.stats);
  const unlocked = useStore((s) => s.unlocked);
  const plan = useStore((s) => s.plan);
  const gallery = useStore((s) => s.gallery);
  const cured = boredom <= 0;
  const done = plan.filter((p) => p.done).length;

  const rows = [
    { k: "time wasted, lifetime", v: formatDuration(stats.seconds), c: "#58b6ff" },
    { k: "things fiddled with", v: stats.events.toLocaleString(), c: "#ffb020" },
    { k: "boredom remaining", v: `${Math.round(boredom)}%`, c: cured ? "#35e39f" : "#ff5f45" },
    { k: "best reflex run", v: stats.arcadeBest.toLocaleString(), c: "#58b6ff" },
    { k: "generations watched", v: stats.gens.toLocaleString(), c: "#ff8fd0" },
    { k: "assignments done", v: `${done}/${plan.length}`, c: "#b46bff" },
    { k: "paintings pinned", v: `${gallery.length}`, c: "#ffb020" },
    { k: "badges", v: `${unlocked.length}/${BADGES.length}`, c: "#35e39f" },
  ];

  const marquee = "MADE WHILE BORED · NO SAMPLES, NO TEMPLATES, NO EXCUSES · ";

  return (
    <footer className="relative border-t border-bone/10 px-4 pt-16 pb-8 sm:px-7">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.26em] text-ash uppercase">
              {cured ? "diagnosis: cured" : "diagnosis: still bored"}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.4rem,8vw,5.4rem)] leading-[0.86] font-extrabold tracking-tight">
              NOW GO
              <br />
              <span className="text-outline">BE BORED</span>
              <br />
              SOMEWHERE ELSE.
            </h2>
            <p className="mt-5 max-w-md text-[0.92rem] leading-relaxed text-ash">
              Everything here runs in your browser: the paintings are noise fields, the drums are
              oscillators, the life organ is a cellular automaton that sings, and the oracle is three
              arrays in a trench coat. Close the tab and it all evaporates, except your ledger, your
              gallery and your plan.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <dl>
              {rows.map((st) => (
                <div key={st.k} className="flex items-baseline justify-between gap-4 border-b border-bone/10 py-2">
                  <dt className="font-mono text-[0.6rem] tracking-[0.2em] text-ash uppercase">{st.k}</dt>
                  <dd className="font-display text-[1.15rem] font-extrabold tabular-nums" style={{ color: st.c }}>
                    {st.v}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="panel p-4">
              <span className="font-mono text-[0.58rem] tracking-[0.22em] text-ash uppercase">keyboard</span>
              <ul className="mt-2.5 space-y-1.5 font-mono text-[0.62rem] text-ash">
                <li>
                  <span className="kbd">1</span>–<span className="kbd">5</span> jump to a section
                </li>
                <li>
                  <span className="kbd">space</span> start a reflex run
                </li>
                <li>
                  <span className="kbd">q w e r / a s d f / z x c v / u i o p</span> tap the arcade grid
                </li>
                <li>
                  <span className="kbd">shift</span> + click a beat pad to lower its level
                </li>
              </ul>
            </div>

            <a href="#top" className="btn self-start">
              ↑ back to the top
            </a>
          </div>
        </div>
      </div>

      <div className="mt-14 overflow-hidden border-y border-bone/10 py-2.5">
        <div className="marquee-track rev">
          {[0, 1].map((k) => (
            <span
              key={k}
              className="flex font-display text-[0.85rem] font-extrabold tracking-[0.2em] whitespace-nowrap text-bone/45"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="flex items-center">
                  {marquee}
                  <span className="mx-2 inline-block h-1.5 w-1.5 rotate-45 bg-mint" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-[0.55rem] tracking-[0.2em] text-ash/60 uppercase">
        the boredom machine · cabinet № 007 · built in one sitting, improved in another
      </p>
    </footer>
  );
}
