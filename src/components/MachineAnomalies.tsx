import { useEffect, useMemo, useState } from "react";
import SectionShell from "./SectionShell";
import { useBoredom, useStore } from "../lib/boredom";
import { play, unlockAudio } from "../lib/audio";

const ANOMALIES = [
  { id: "clock-slip", code: "A-01", name: "The Borrowed Minute", signal: "CLOCK DRIFT", detail: "Every clock in the machine briefly disagrees. One minute appears where it should not.", clue: "A timestamp in the activity log is one minute ahead.", effect: "The whole interface slips out of rhythm: readouts flicker and the page develops a soft temporal stutter." },
  { id: "route-ghost", code: "A-02", name: "The Extra Door", signal: "UNMAPPED ROUTE", detail: "A door appears in the station map, although no station was built there.", clue: "The route is not listed in the navigation index.", effect: "A ghostly route marker appears across the machine, pointing toward an unregistered destination." },
  { id: "pip-echo", code: "A-03", name: "PIP's Echo", signal: "DUPLICATE SIGNAL", detail: "A second PIP signal answers a question before the original signal is sent.", clue: "Two identical signatures. Different arrival times.", effect: "PIP receives an echo signal and changes its responses while the anomaly is active." },
  { id: "colour-leak", code: "A-04", name: "Colour Leak", signal: "PALETTE BREACH", detail: "A colour from a locked theme leaks into the current room, then disappears.", clue: "The colour is not listed in the active theme.", effect: "A shifting colour contaminates the entire website, including every station and the navigation." },
  { id: "silent-wave", code: "A-05", name: "The Silent Station", signal: "AUDIO NULL", detail: "One station stops responding to the machine's sound system. The rest keep working.", clue: "The station is active. Its audio channel is not.", effect: "The machine enters a quiet visual mode. Sound controls remain available and your mute setting is never changed." },
] as const;

export default function MachineAnomalies() {
  const { nudge, activateAnomaly, clearAnomaly } = useBoredom();
  const anomaly = useStore((s) => s.anomaly);
  const [selectedId, setSelectedId] = useState<(typeof ANOMALIES)[number]["id"] | null>(null);
  const [scans, setScans] = useState(0);
  const [now, setNow] = useState(Date.now());
  const active = useMemo(() => ANOMALIES.find((item) => item.id === selectedId) ?? null, [selectedId]);
  const globalActive = ANOMALIES.find((item) => item.id === anomaly?.id) ?? null;
  const remaining = anomaly ? Math.max(0, Math.ceil((anomaly.expiresAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!anomaly) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [anomaly?.startedAt]);

  const scan = () => {
    const pool = ANOMALIES.filter((item) => item.id !== anomaly?.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setSelectedId(next.id);
    setScans((value) => value + 1);
    unlockAudio();
    play("click", 900, { vol: 0.18 });
    nudge(1, "ANOMALY ACTIVATED");
    activateAnomaly(next.id);
  };

  const amplify = () => {
    if (!globalActive) return;
    nudge(0.5, "ANOMALY AMPLIFIED");
    activateAnomaly(globalActive.id, 42000);
  };

  const contain = () => {
    clearAnomaly();
    play("unlock", 660, { vol: 0.2 });
    nudge(1, "ANOMALY CONTAINED");
  };

  return (
    <SectionShell id="anomalies" index="07" kicker="system integrity / unknown signals"
      title="Something is wrong with the machine."
      blurb="This station is connected to the entire system. Scanning activates a temporary anomaly that changes the whole website — not just this room."
      accent="#b46bff"
      controls={<span className="font-mono text-[0.62rem] tracking-[0.16em] text-ash uppercase">scans logged · {scans}</span>}>
      <div className="panel relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.08]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.2em] text-plum uppercase"><span className="h-2 w-2 rounded-full bg-plum blink" /> diagnostic channel open</div>
            {active ? <div key={active.id} className="quote-in mt-4">
              <div className="font-mono text-[0.62rem] tracking-[0.2em] text-ash">{active.code} // {active.signal}</div>
              <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{active.name}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/80">{active.detail}</p>
              <p className="mt-3 font-mono text-xs leading-relaxed text-plum">TRACE: {active.clue}</p>
              <p className="mt-3 text-sm leading-relaxed text-ash">{active.effect}</p>
            </div> : <div className="mt-4">
              <h3 className="font-display text-2xl font-extrabold sm:text-3xl">No anomaly selected.</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ash">The system looks normal. That is usually when it gets interesting.</p>
            </div>}
          </div>
          <button type="button" onClick={scan} className="btn border-plum/60 bg-plum/10 px-5 py-3 text-plum hover:bg-plum hover:text-ink">{globalActive ? "scan for another ↗" : "run diagnostic ↗"}</button>
        </div>
        <div className="relative mt-6 border-t border-bone/10 pt-4">
          {globalActive ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-plum/35 bg-plum/[0.07] p-3">
            <div><div className="font-mono text-[0.6rem] tracking-[0.16em] text-plum uppercase">global anomaly active · {remaining}s</div><div className="mt-1 text-sm text-bone">{globalActive.name} is affecting every station.</div></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={amplify} className="btn">amplify +18s</button><button type="button" onClick={contain} className="btn border-coral/50 text-coral">contain signal</button></div>
          </div> : <p className="mb-4 font-mono text-[0.6rem] tracking-[0.14em] text-ash uppercase">No global effects running · scan to disturb the system</p>}
          <div className="flex flex-wrap gap-2">
            {ANOMALIES.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={active?.id === item.id} className={`border px-2 py-1 font-mono text-[0.58rem] tracking-[0.12em] transition-colors ${active?.id === item.id ? "border-plum/70 bg-plum/15 text-plum" : "border-bone/10 text-ash hover:border-bone/30"}`}>{item.code} · {item.name}</button>)}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
