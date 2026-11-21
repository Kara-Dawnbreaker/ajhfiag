import { useEffect } from "react";
import { startClock } from "./lib/boredom";
import TopBar from "./components/TopBar";
import Hero from "./components/Hero";
import FlowStudio from "./components/FlowStudio";
import BeatMachine from "./components/BeatMachine";
import Interlude from "./components/Interlude";
import GravitySandbox from "./components/GravitySandbox";
import ReflexArcade from "./components/ReflexArcade";
import Oracle from "./components/Oracle";
import LifeOrgan from "./components/LifeOrgan";
import Ledger from "./components/Ledger";
import Footer from "./components/Footer";
import Companion from "./components/Companion";

const JUMP: Record<string, string> = {
  "1": "flow",
  "2": "beat",
  "3": "gravity",
  "4": "reflex",
  "5": "oracle",
  "6": "life",
  "7": "ledger",
};

export default function App() {
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
          <GravitySandbox />
          <ReflexArcade />
          <Oracle />
          <LifeOrgan />
          <Ledger />
        </main>
        <Footer />
      </div>
      <Companion />
    </>
  );
}
