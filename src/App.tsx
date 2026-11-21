import { useEffect } from "react";
import { startClock } from "./lib/boredom";
import TopBar from "./components/TopBar";
import Hero from "./components/Hero";
import FlowStudio from "./components/FlowStudio";
import BeatMachine from "./components/BeatMachine";
import Interlude from "./components/Interlude";
import ReflexArcade from "./components/ReflexArcade";
import Blink from "./components/Blink";
import LifeOrgan from "./components/LifeOrgan";
import Ledger from "./components/Ledger";
import MachineAnomalies from "./components/MachineAnomalies";
import ResearchCases from "./components/ResearchCases";
import Footer from "./components/Footer";
import Companion from "./components/Companion";
import { useStore } from "./lib/boredom";

const JUMP: Record<string, string> = {
  "1": "flow", "2": "beat", "3": "reflex", "4": "blink", "5": "life", "6": "ledger", "7": "anomalies", "8": "cases",
};

export default function App() {
  const anomaly = useStore((s) => s.anomaly);

  useEffect(() => {
    if (anomaly) document.documentElement.dataset.machineAnomaly = anomaly.id;
    else delete document.documentElement.dataset.machineAnomaly;
    return () => { delete document.documentElement.dataset.machineAnomaly; };
  }, [anomaly?.id]);

  useEffect(() => {
    startClock();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const id = JUMP[e.key];
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="stage-bg" aria-hidden />
      <div className="relative z-10">
        <TopBar />
        <main>
          <Hero />
          <FlowStudio />
          <BeatMachine />
          <Interlude />
          <ReflexArcade />
          <Blink />
          <LifeOrgan />
          <Ledger />
          <MachineAnomalies />
          <ResearchCases />
        </main>
        <Footer />
      </div>
      <Companion />
    </>
  );
}
