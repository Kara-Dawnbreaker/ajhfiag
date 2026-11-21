import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useInView } from "../lib/hooks";
import { useBoredom } from "../lib/boredom";
import { isMuted } from "../lib/audio";
import { cn } from "../utils/cn";

const STEPS = 16;

type TrackDef = { id: string; name: string; color: string; pitched: boolean };

const TRACKS: TrackDef[] = [
  { id: "kick", name: "Kick", color: "#ff5f45", pitched: false },
  { id: "snare", name: "Snare", color: "#ffb020", pitched: false },
  { id: "hat", name: "Hat", color: "#f4ece0", pitched: false },
  { id: "bass", name: "Bass", color: "#35e39f", pitched: true },
  { id: "blip", name: "Blip", color: "#58b6ff", pitched: true },
];

const row = (s: string) => s.split("").map((c) => Number(c));

const PRESETS: Record<string, number[][]> = {
  house: [
    row("1000100010001000"),
    row("0000100000001000"),
    row("0010001000100010"),
    row("0000200000003000"),
    row("0000000000100000"),
  ],
  boombap: [
    row("1000001000100000"),
    row("0000100000001000"),
    row("1010101010101012"),
    row("1000001000000000"),
    row("0000000000010000"),
  ],
  broken: [
    row("1000010010000010"),
    row("0000100001001000"),
    row("0120010110010120"),
    row("0003000000020000"),
    row("0010000100000100"),
  ],
  empty: [
    row("0000000000000000"),
    row("0000000000000000"),
    row("0000000000000000"),
    row("0000000000000000"),
    row("0000000000000000"),
  ],
};

const BASS_NOTES = [55, 73.42, 82.41, 98];
const BLIP_NOTES = [440, 523.25, 659.25, 880];

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  noise: AudioBuffer;
};

export default function BeatMachine() {
  const { nudge, track } = useBoredom();
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>();
  const [pattern, setPattern] = useState<number[][]>(PRESETS.house.map((r) => [...r]));
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(112);
  const [swing, setSwing] = useState(0.18);
  const [volume, setVolume] = useState(0.75);
  const [step, setStep] = useState(-1);
  const [muted, setMuted] = useState<boolean[]>([false, false, false, false, false]);
  const [preset, setPreset] = useState("house");
  const [audioError, setAudioError] = useState(false);

  const engine = useRef<Engine | null>(null);
  const patternRef = useRef(pattern);
  const mutedRef = useRef(muted);
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const timer = useRef<number | null>(null);
  const raf = useRef(0);
  const current = useRef(0);
  const nextTime = useRef(0);
  const queue = useRef<{ step: number; time: number }[]>([]);
  const scopeRef = useRef<HTMLCanvasElement | null>(null);

  patternRef.current = pattern;
  mutedRef.current = muted;
  bpmRef.current = bpm;
  swingRef.current = swing;

  const ensureAudio = (): Engine | null => {
    if (engine.current) return engine.current;
    const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      setAudioError(true);
      return null;
    }
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = volume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      master.connect(analyser);
      analyser.connect(ctx.destination);

      const len = Math.floor(ctx.sampleRate * 0.6);
      const noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      engine.current = { ctx, master, analyser, noise };
      setAudioError(false);
      return engine.current;
    } catch {
      setAudioError(true);
      return null;
    }
  };

  useEffect(() => {
    if (engine.current) engine.current.master.gain.value = volume;
  }, [volume]);

  const voice = (trackIdx: number, level: number, when: number) => {
    if (isMuted()) return;
    const eng = ensureAudio();
    if (!eng) return;
    const { ctx, master, noise } = eng;
    const g = 0.35 + level * 0.3;

    if (trackIdx === 0) {
      const o = ctx.createOscillator();
      const gain = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, when);
      o.frequency.exponentialRampToValueAtTime(44, when + 0.11);
      gain.gain.setValueAtTime(g * 1.5, when);
      gain.gain.exponentialRampToValueAtTime(0.0008, when + 0.34);
      o.connect(gain).connect(master);
      o.start(when);
      o.stop(when + 0.36);
    } else if (trackIdx === 1) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1750;
      bp.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(g * 0.85, when);
      gain.gain.exponentialRampToValueAtTime(0.0008, when + 0.19);
      const body = ctx.createOscillator();
      body.type = "triangle";
      body.frequency.setValueAtTime(190, when);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(g * 0.5, when);
      bg.gain.exponentialRampToValueAtTime(0.0008, when + 0.1);
      src.connect(bp).connect(gain).connect(master);
      body.connect(bg).connect(master);
      src.start(when);
      src.stop(when + 0.22);
      body.start(when);
      body.stop(when + 0.12);
    } else if (trackIdx === 2) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(g * 0.32, when);
      gain.gain.exponentialRampToValueAtTime(0.0005, when + 0.055);
      src.connect(hp).connect(gain).connect(master);
      src.start(when);
      src.stop(when + 0.07);
    } else if (trackIdx === 3) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(BASS_NOTES[level - 1] ?? 55, when);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(220, when);
      lp.frequency.exponentialRampToValueAtTime(1100, when + 0.05);
      lp.frequency.exponentialRampToValueAtTime(180, when + 0.26);
      lp.Q.value = 7;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(g * 0.9, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, when + 0.3);
      o.connect(lp).connect(gain).connect(master);
      o.start(when);
      o.stop(when + 0.32);
    } else {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(BLIP_NOTES[level - 1] ?? 440, when);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(g * 0.24, when + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0006, when + 0.22);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3600;
      o.connect(gain).connect(lp).connect(master);
      o.start(when);
      o.stop(when + 0.24);
    }
  };

  const scheduler = () => {
    const eng = engine.current;
    if (!eng) return;
    const spb = 60 / bpmRef.current / 4;
    while (nextTime.current < eng.ctx.currentTime + 0.12) {
      const s = current.current;
      const swingOffset = s % 2 === 1 ? swingRef.current * spb * 0.55 : 0;
      const when = nextTime.current + swingOffset;
      queue.current.push({ step: s, time: nextTime.current });
      for (let t = 0; t < TRACKS.length; t++) {
        const lvl = patternRef.current[t][s];
        if (lvl > 0 && !mutedRef.current[t]) voice(t, lvl, when);
      }
      nextTime.current += spb;
      current.current = (s + 1) % STEPS;
    }
  };

  // playhead + oscilloscope loop
  useEffect(() => {
    if (!playing) {
      setStep(-1);
      cancelAnimationFrame(raf.current);
      return;
    }
    const draw = () => {
      const eng = engine.current;
      if (eng) {
        while (queue.current.length && queue.current[0].time < eng.ctx.currentTime) {
          setStep(queue.current.shift()!.step);
        }
        const cvs = scopeRef.current;
        if (cvs && inView) {
          const ctx2d = cvs.getContext("2d");
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = cvs.clientWidth;
          const h = cvs.clientHeight;
          if (cvs.width !== w * dpr) {
            cvs.width = w * dpr;
            cvs.height = h * dpr;
          }
          if (ctx2d) {
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.clearRect(0, 0, w, h);
            const buf = new Uint8Array(eng.analyser.frequencyBinCount);
            eng.analyser.getByteTimeDomainData(buf);
            ctx2d.lineWidth = 1.6;
            ctx2d.strokeStyle = "#ff5f45";
            ctx2d.beginPath();
            for (let i = 0; i < buf.length; i += 2) {
              const x = (i / buf.length) * w;
              const y = h / 2 + ((buf[i] - 128) / 128) * (h / 2 - 2);
              i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
            }
            ctx2d.stroke();
            ctx2d.strokeStyle = "rgba(244,236,224,0.1)";
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(0, h / 2);
            ctx2d.lineTo(w, h / 2);
            ctx2d.stroke();
          }
        }
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, inView]);

  const togglePlay = () => {
    const eng = ensureAudio();
    if (!eng) return;
    void eng.ctx.resume().catch(() => setAudioError(true));
    if (playing) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      queue.current = [];
      setPlaying(false);
    } else {
      current.current = 0;
      nextTime.current = eng.ctx.currentTime + 0.06;
      timer.current = window.setInterval(scheduler, 25);
      setPlaying(true);
      nudge(3, "DROPPED A BEAT");
      track("beats");
    }
  };

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    cancelAnimationFrame(raf.current);
    engine.current?.ctx.close();
  }, []);

  const hitCell = (t: number, s: number, e: React.MouseEvent) => {
    const dir = e.shiftKey ? -1 : 1;
    setPattern((p) => {
      const next = p.map((r) => [...r]);
      next[t][s] = (next[t][s] + dir + 4) % 4;
      return next;
    });
    if (dir > 0) {
      const eng = ensureAudio();
      if (eng) {
        void eng.ctx.resume().catch(() => setAudioError(true));
        voice(t, 1, eng.ctx.currentTime + 0.005);
      }
      nudge(1, "SEQUENCED");
    }
  };

  const randomise = () => {
    const densities = [0.32, 0.18, 0.55, 0.22, 0.16];
    setPattern(
      TRACKS.map((_, t) =>
        Array.from({ length: STEPS }, (_, s) => {
          const accent = t === 0 && s % 4 === 0 ? 0.3 : 0;
          return Math.random() < densities[t] + accent ? (Math.random() < 0.3 ? 2 : 1) : 0;
        }),
      ),
    );
    setPreset("random");
    nudge(2, "ROLLED THE DICE");
  };

  const loadPreset = (name: string) => {
    setPattern(PRESETS[name].map((r) => [...r]));
    setPreset(name);
    nudge(1.5, "LOADED A GROOVE");
  };

  return (
    <SectionShell
      id="beat"
      index="02"
      kicker="16-step drum machine"
      title="Build a groove out of oscillators."
      blurb="Every sound here is synthesised live in your browser — no samples. Click a pad to switch it on, click again to raise its level (bass and blip change pitch as they climb), shift-click to step back down. Click a track name to mute it."
      accent="#ff5f45"
      controls={
        <>
          <button
            className={cn("btn", playing && "border-coral bg-coral text-ink hover:bg-bone")}
            onClick={togglePlay}
            type="button"
          >
            {playing ? "■ stop" : "▶ play"}
          </button>
          {(["house", "boombap", "broken"] as const).map((p) => (
            <button
              key={p}
              className={cn("btn", preset === p && "border-bone/70 bg-bone/15")}
              onClick={() => loadPreset(p)}
              type="button"
            >
              {p}
            </button>
          ))}
          <button className="btn" onClick={randomise} type="button">
            dice
          </button>
          <button className="btn" onClick={() => loadPreset("empty")} type="button">
            clear
          </button>
        </>
      }
    >
      <div ref={wrapRef} className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-bone/10 px-4 py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[3rem] leading-none font-extrabold tabular-nums text-coral">
              {bpm}
            </span>
            <span className="font-mono text-[0.6rem] tracking-[0.2em] text-ash uppercase">bpm</span>
          </div>

          <div className="w-40">
            <span className="flex justify-between font-mono text-[0.58rem] tracking-[0.18em] text-ash uppercase">
              tempo <span className="text-bone">{bpm}</span>
            </span>
            <input
              type="range"
              min={64}
              max={180}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="mt-2"
            />
          </div>
          <div className="w-32">
            <span className="flex justify-between font-mono text-[0.58rem] tracking-[0.18em] text-ash uppercase">
              swing <span className="text-bone">{Math.round(swing * 100)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={0.7}
              step={0.01}
              value={swing}
              onChange={(e) => setSwing(Number(e.target.value))}
              className="mt-2"
            />
          </div>
          <div className="w-32">
            <span className="flex justify-between font-mono text-[0.58rem] tracking-[0.18em] text-ash uppercase">
              volume <span className="text-bone">{Math.round(volume * 100)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="mt-2"
            />
          </div>

          <div className="ml-auto hidden h-12 w-40 sm:block">
            <canvas ref={scopeRef} className="h-full w-full" />
          </div>
        </div>

        <div className="overflow-x-auto px-3 py-4">
          <div className="min-w-[620px]">
            <div className="mb-2 grid grid-cols-[74px_1fr] items-center gap-3">
              <span className="font-mono text-[0.55rem] tracking-[0.18em] text-ash uppercase">
                track
              </span>
              <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                {Array.from({ length: STEPS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-center font-mono text-[0.52rem] tabular-nums",
                      i % 4 === 0 ? "text-bone/70" : "text-ash/50",
                    )}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>

            {TRACKS.map((t, ti) => (
              <div key={t.id} className="mb-1 grid grid-cols-[74px_1fr] items-center gap-3">
                <button
                  type="button"
                  aria-pressed={muted[ti]}
                  onClick={() => {
                    setMuted((m) => m.map((v, i) => (i === ti ? !v : v)));
                    nudge(0.5, "MIXED");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 py-2 font-mono text-[0.6rem] tracking-[0.14em] uppercase transition-opacity",
                    muted[ti] ? "text-ash opacity-40 line-through" : "text-bone",
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </button>

                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                  {Array.from({ length: STEPS }, (_, s) => {
                    const lvl = pattern[ti][s];
                    const isBeat = s % 4 === 0;
                    const isHead = step === s && playing;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => hitCell(ti, s, e)}
                        aria-label={`${t.name} step ${s + 1}`}
                        className={cn(
                          "group relative h-9 border transition-all duration-150",
                          isBeat ? "border-bone/18" : "border-bone/10",
                          "bg-bone/[0.03] hover:bg-bone/12",
                          isHead && "ring-1 ring-bone/60",
                        )}
                        style={
                          lvl > 0
                            ? {
                                background: t.color,
                                opacity: 0.35 + lvl * 0.22,
                                boxShadow: isHead ? `0 0 16px ${t.color}` : undefined,
                              }
                            : isHead
                              ? { background: "rgba(244,236,224,0.16)" }
                              : undefined
                        }
                      >
                        <span
                          className={cn(
                            "absolute inset-x-0 bottom-0 bg-ink/45 transition-all duration-150",
                            lvl >= 2 ? "h-1/3" : "h-0",
                          )}
                        />
                        <span
                          className={cn(
                            "absolute inset-x-0 top-0 bg-ink/45 transition-all duration-150",
                            lvl >= 3 ? "h-1/3" : "h-0",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-bone/10 px-4 py-3 font-mono text-[0.58rem] tracking-[0.14em] text-ash uppercase">
          <span>click = level up</span>
          <span>shift+click = level down</span>
          <span>track name = mute</span>
          {audioError ? <span role="status" className="w-full text-coral">Audio is unavailable in this browser. Try a recent browser with audio enabled.</span> : null}
          <span className="ml-auto flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", playing ? "bg-mint blink" : "bg-ash/40")} />
            {playing ? `playing · step ${(step + 1 + STEPS) % STEPS || 16}/16` : "stopped"}
          </span>
        </div>
      </div>
    </SectionShell>
  );
}
