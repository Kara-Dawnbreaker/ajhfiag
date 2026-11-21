import { useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useCanvasStage, useInView } from "../lib/hooks";
import { noise2 } from "../lib/noise";
import { useBoredom } from "../lib/boredom";
import { cn } from "../utils/cn";

const PALETTES = [
  { name: "Solar", colors: ["#ffb020", "#ff5f45", "#ff8a3d", "#ffe6a7"] },
  { name: "Reef", colors: ["#35e39f", "#58b6ff", "#2dd4bf", "#d9fff1"] },
  { name: "Bruise", colors: ["#b46bff", "#ff5f45", "#58b6ff", "#f4ece0"] },
  { name: "Graphite", colors: ["#f4ece0", "#a2938a", "#6b5f59", "#ffffff"] },
  { name: "Citrus", colors: ["#35e39f", "#ffb020", "#f4ece0", "#58b6ff"] },
];

type P = { x: number; y: number; px: number; py: number; c: string; life: number };

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: () => void;
  display: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">
        {label}
        <span className="text-bone tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        className="mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyDown={onCommit}
      />
    </label>
  );
}

export default function FlowStudio() {
  const { nudge, track, pinImage } = useBoredom();
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>();
  const [palette, setPalette] = useState(0);
  const [density, setDensity] = useState(850);
  const [speed, setSpeed] = useState(1);
  const [turbulence, setTurbulence] = useState(1);
  const [trail, setTrail] = useState(0.06);
  const strokes = useRef(0);
  const [, force] = useState(0);

  const parts = useRef<P[]>([]);
  const seed = useRef(Math.random() * 1000);
  const clock = useRef(0);
  const pointer = useRef({ x: -9999, y: -9999, inside: false });
  const params = useRef({ palette, density, speed, turbulence, trail });
  params.current = { palette, density, speed, turbulence, trail };

  const { canvasRef } = useCanvasStage(inView, (ctx, w, h, dt) => {
    const { palette: pi, density: d, speed: sp, turbulence: tb, trail: tr } = params.current;
    const cols = PALETTES[pi].colors;
    clock.current += dt * sp;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(15,12,11,${tr})`;
    ctx.fillRect(0, 0, w, h);

    // keep particle pool in sync with the density slider
    while (parts.current.length < d) {
      parts.current.push({
        x: Math.random() * w,
        y: Math.random() * h,
        px: 0,
        py: 0,
        c: cols[Math.floor(Math.random() * cols.length)],
        life: Math.random() * 260 + 60,
      });
      parts.current[parts.current.length - 1].px = parts.current[parts.current.length - 1].x;
      parts.current[parts.current.length - 1].py = parts.current[parts.current.length - 1].y;
    }
    if (parts.current.length > d) parts.current.length = d;

    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.05;
    ctx.lineCap = "round";

    const scale = 0.0022 * tb;
    const t = clock.current * 0.12;
    const px = pointer.current.x;
    const py = pointer.current.y;

    for (let i = 0; i < parts.current.length; i++) {
      const p = parts.current[i];
      let a = noise2(p.x * scale + seed.current, p.y * scale + t) * Math.PI * 3.2;

      if (pointer.current.inside) {
        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 40000) {
          const f = 1 - d2 / 40000;
          a += Math.atan2(dy, dx) * f * 1.6 + f * 2.2;
        }
      }

      p.px = p.x;
      p.py = p.y;
      p.x += Math.cos(a) * 1.5 * sp;
      p.y += Math.sin(a) * 1.5 * sp;
      p.life -= 1;

      if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20 || p.life <= 0) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.px = p.x;
        p.py = p.y;
        p.life = Math.random() * 260 + 60;
        p.c = cols[Math.floor(Math.random() * cols.length)];
        continue;
      }

      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      strokes.current++;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  });

  const burst = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    pointer.current = { x, y, inside: true };
    const cols = PALETTES[params.current.palette].colors;
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 26;
      parts.current.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        px: x,
        py: y,
        c: cols[i % cols.length],
        life: 120 + Math.random() * 140,
      });
    }
    if (parts.current.length > params.current.density + 400)
      parts.current.splice(0, parts.current.length - (params.current.density + 400));
    nudge(2, "PAINTED");
    track("bursts");
    strokes.current += 160;
    force((n) => n + 1);
  };

  const reseed = () => {
    seed.current = Math.random() * 1000;
    clock.current = 0;
    parts.current = [];
    nudge(1.5, "RESEEDED");
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0f0c0b";
    ctx.fillRect(0, 0, c.width, c.height);
    parts.current = [];
    nudge(1, "CLEARED");
  };

  const pin = () => {
    const c = canvasRef.current;
    if (!c) return;
    const tw = 480;
    const th = Math.max(1, Math.round((tw * c.height) / c.width));
    const off = document.createElement("canvas");
    off.width = tw;
    off.height = th;
    const o = off.getContext("2d");
    if (!o) return;
    o.fillStyle = "#0f0c0b";
    o.fillRect(0, 0, tw, th);
    o.drawImage(c, 0, 0, tw, th);
    pinImage(off.toDataURL("image/jpeg", 0.74), `${PALETTES[palette].name.toLowerCase()} · ${strokes.current.toLocaleString()} strokes`);
    nudge(2, "PINNED");
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `flow-field-${Date.now()}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    nudge(4, "SAVED ART");
  };

  const tune = () => nudge(1, "TUNED");

  return (
    <SectionShell
      id="flow"
      index="01"
      kicker="generative paint studio"
      title="Let mathematics do the brushwork."
      blurb="Nine hundred particles are crawling through a Perlin noise field, each one dragging a thread of colour behind it. Move your cursor to stir the field, click to detonate a fresh swarm."
      accent="#ffb020"
      controls={
        <>
          <button className="btn" onClick={reseed} type="button">
            reseed
          </button>
          <button className="btn" onClick={clear} type="button">
            clear
          </button>
          <button className="btn" onClick={pin} type="button">
            pin to gallery
          </button>
          <button
            className="btn border-amber/70 bg-amber text-ink hover:bg-bone"
            onClick={save}
            type="button"
          >
            save png
          </button>
        </>
      }
    >
      <div ref={wrapRef} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
        <div className="panel relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block h-[46vh] min-h-[300px] w-full cursor-crosshair touch-none md:h-[58vh]"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
            }}
            onPointerDown={burst}
            onPointerLeave={() => {
              pointer.current.inside = false;
            }}
          />
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 font-mono text-[0.58rem] tracking-[0.2em] text-ash uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-amber blink" />
            {PALETTES[palette].name.toLowerCase()} · {strokes.current.toLocaleString()} strokes
          </div>
          <div className="pointer-events-none absolute right-3 bottom-3 font-mono text-[0.58rem] tracking-[0.2em] text-ash/70 uppercase">
            click to burst
          </div>
        </div>

        <aside className="panel flex flex-col gap-4 p-4">
          <div>
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">
              palette
            </span>
            <div className="mt-2 grid grid-cols-5 gap-1.5 lg:grid-cols-1">
              {PALETTES.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPalette(i);
                    parts.current.forEach((q) => {
                      q.c = p.colors[Math.floor(Math.random() * p.colors.length)];
                    });
                    nudge(1.5, "RECOLOURED");
                  }}
                  className={cn(
                    "group flex items-center gap-2 border p-1.5 transition-all duration-200",
                    palette === i
                      ? "border-bone bg-bone/10"
                      : "border-bone/12 hover:border-bone/40 hover:bg-bone/5",
                  )}
                >
                  <span className="flex">
                    {p.colors.map((c) => (
                      <span
                        key={c}
                        className="h-3.5 w-3.5 -ml-1 rounded-full ring-1 ring-ink first:ml-0"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span className="hidden font-mono text-[0.58rem] tracking-[0.14em] text-ash uppercase group-hover:text-bone lg:block">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="particles"
            value={density}
            min={150}
            max={2200}
            step={50}
            onChange={setDensity}
            onCommit={tune}
            display={String(density)}
          />
          <Slider
            label="flow speed"
            value={speed}
            min={0.2}
            max={3}
            step={0.1}
            onChange={setSpeed}
            onCommit={tune}
            display={`${speed.toFixed(1)}×`}
          />
          <Slider
            label="turbulence"
            value={turbulence}
            min={0.3}
            max={4}
            step={0.1}
            onChange={setTurbulence}
            onCommit={tune}
            display={turbulence.toFixed(1)}
          />
          <Slider
            label="trail length"
            value={1 - trail}
            min={0.7}
            max={0.995}
            step={0.005}
            onChange={(v) => setTrail(1 - v)}
            onCommit={tune}
            display={`${Math.round((1 - trail) * 100)}%`}
          />

          <p className="mt-auto border-t border-bone/10 pt-3 font-mono text-[0.58rem] leading-relaxed tracking-[0.1em] text-ash uppercase">
            saving keeps the pixels, not the math — reseed for a different universe
          </p>
        </aside>
      </div>
    </SectionShell>
  );
}
