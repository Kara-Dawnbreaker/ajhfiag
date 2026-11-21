import { useState } from "react";
import SectionShell from "./SectionShell";
import { useBoredom } from "../lib/boredom";

const ANOMALIES = [
  { code: "A-01", name: "The Borrowed Minute", signal: "CLOCK DRIFT", detail: "Every clock in the machine briefly disagrees. One minute appears where it should not.", clue: "A timestamp in the activity log is one minute ahead." },
  { code: "A-02", name: "The Extra Door", signal: "UNMAPPED ROUTE", detail: "A door appears in the station map, although no station was built there.", clue: "The door vanishes when the page is refreshed." },
  { code: "A-03", name: "PIP's Echo", signal: "DUPLICATE SIGNAL", detail: "A second PIP signal answers a question before the original signal is sent.", clue: "Two identical signatures. Different arrival times." },
  { code: "A-04", name: "Colour Leak", signal: "PALETTE BREACH", detail: "A colour from a locked theme leaks into the current room, then disappears.", clue: "The colour is not listed in the active theme." },
  { code: "A-05", name: "The Silent Station", signal: "AUDIO NULL", detail: "One station stops responding to the machine's sound system. The rest keep working.", clue: "The station is active. Its audio channel is not." },
];

export default function MachineAnomalies() {
  const { nudge } = useBoredom();
  const [active, setActive] = useState<(typeof ANOMALIES)[number] | null>(null);
  const [scans, setScans] = useState(0);

  const scan = () => {
    const pool = ANOMALIES.filter((item) => item.code !== active?.code);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setActive(next);
    setScans((value) => value + 1);
    nudge(1, "ANOMALY FOUND");
  };

  return (
    <SectionShell
      id="anomalies"
      index="07"
      kicker="system integrity / unknown signals"
      title="Something is wrong with the machine."
      blurb="Unscheduled behaviour has been detected across the system. Run a scan, inspect the signal, and decide whether it is a fault… or something else."
      accent="#b46bff"
      controls={<span className="font-mono text-[0.62rem] tracking-[0.16em] text-ash uppercase">scans logged · {scans}</span>}
    >
      <div className="panel relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] grid-lines" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.2em] text-plum uppercase">
              <span className="h-2 w-2 rounded-full bg-plum blink" /> diagnostic channel open
            </div>
            {active ? (
              <div key={active.code} className="quote-in mt-4">
                <div className="font-mono text-[0.62rem] tracking-[0.2em] text-ash">{active.code} // {active.signal}</div>
                <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{active.name}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/80">{active.detail}</p>
                <p className="mt-3 font-mono text-xs leading-relaxed text-plum">TRACE: {active.clue}</p>
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="font-display text-2xl font-extrabold sm:text-3xl">No anomaly selected.</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ash">The system looks normal. That is usually when it gets interesting.</p>
              </div>
            )}
          </div>
          <button type="button" onClick={scan} className="btn border-plum/60 bg-plum/10 px-5 py-3 text-plum hover:bg-plum hover:text-ink">
            {active ? "scan again ↗" : "run diagnostic ↗"}
          </button>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 border-t border-bone/10 pt-4">
          {ANOMALIES.map((item) => (
            <span key={item.code} className={`border px-2 py-1 font-mono text-[0.58rem] tracking-[0.12em] ${active?.code === item.code ? "border-plum/70 bg-plum/15 text-plum" : "border-bone/10 text-ash"}`}>
              {item.code} {active?.code === item.code ? "· ACTIVE" : "· DORMANT"}
            </span>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
