import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { useCanvasStage, useInView } from "../lib/hooks";
import { useBoredom } from "../lib/boredom";

type Body = { x: number; y: number; px: number; py: number; vx: number; vy: number };
type Star = { x: number; y: number; m: number; born: number };

export default function GravitySandbox() {
  const { nudge, track } = useBoredom();
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>();
  const [count, setCount] = useState(420);
  const [gravity, setGravity] = useState(1);
  const [trail, setTrail] = useState(0.14);
  const [stars, setStars] = useState(0);
  const [energy, setEnergy] = useState(0);

  const bodies = useRef<Body[]>([]);
  const starList = useRef<Star[]>([]);
  const pointer = useRef({ x: -9999, y: -9999, inside: false, down: false });
  const downAt = useRef({ x: 0, y: 0, t: 0 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const params = useRef({ count, gravity, trail });
  params.current = { count, gravity, trail };
  const energyRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setEnergy(Math.round(energyRef.current)), 400);
    return () => window.clearInterval(id);
  }, []);



  const { canvasRef } = useCanvasStage(inView, (ctx, w, h, dt, t) => {
    if (sizeRef.current.w !== w || sizeRef.current.h !== h || bodies.current.length === 0) {
      sizeRef.current = { w, h };
      bodies.current = Array.from({ length: params.current.count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        return { x, y, px: x, py: y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60 };
      });
    }

    const G = 9000 * params.current.gravity;
    while (bodies.current.length < params.current.count) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      bodies.current.push({ x, y, px: x, py: y, vx: 0, vy: 0 });
    }
    if (bodies.current.length > params.current.count) bodies.current.length = params.current.count;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(15,12,11,${params.current.trail})`;
    ctx.fillRect(0, 0, w, h);

    // attractors: planted stars + the cursor
    const attractors: { x: number; y: number; m: number }[] = starList.current.map((s) => ({
      x: s.x,
      y: s.y,
      m: s.m,
    }));
    if (pointer.current.inside) {
      attractors.push({
        x: pointer.current.x,
        y: pointer.current.y,
        m: pointer.current.down ? -1.5 : 1,
      });
    }

    let sumSpeed = 0;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.15;

    for (const b of bodies.current) {
      for (const a of attractors) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = Math.max(90, dx * dx + dy * dy);
        const f = (G * a.m) / d2;
        const d = Math.sqrt(d2);
        b.vx += (dx / d) * f * dt;
        b.vy += (dy / d) * f * dt;
      }

      b.vx *= 0.999;
      b.vy *= 0.999;
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.82; }
      if (b.x > w) { b.x = w; b.vx = -Math.abs(b.vx) * 0.82; }
      if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * 0.82; }
      if (b.y > h) { b.y = h; b.vy = -Math.abs(b.vy) * 0.82; }

      const sp = Math.hypot(b.vx, b.vy);
      sumSpeed += sp;
      ctx.strokeStyle = sp > 420 ? "#ff5f45" : sp > 190 ? "#ffb020" : "#35e39f";
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    energyRef.current = sumSpeed / Math.max(1, bodies.current.length);

    // stars
    for (const s of starList.current) {
      const pulse = 1 + Math.sin(t * 3 + s.born) * 0.12;
      const r = 11 * pulse * (s.m / 1.4);
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.2);
      grad.addColorStop(0, "rgba(244,236,224,0.95)");
      grad.addColorStop(0.25, "rgba(88,182,255,0.5)");
      grad.addColorStop(1, "rgba(88,182,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4ece0";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    if (pointer.current.inside) {
      ctx.strokeStyle = pointer.current.down ? "rgba(255,95,69,0.5)" : "rgba(53,227,159,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.current.x, pointer.current.y, 22 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  });

  const localPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const chaos = () => {
    bodies.current.forEach((b) => {
      b.vx = (Math.random() - 0.5) * 900;
      b.vy = (Math.random() - 0.5) * 900;
    });
    nudge(2, "STIRRED THE VOID");
  };

  const orbitAll = () => {
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h / 2;
    bodies.current.forEach((b) => {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const d = Math.max(20, Math.hypot(dx, dy));
      const sp = 3400 / Math.sqrt(d) * 0.6;
      b.vx = (-dy / d) * sp;
      b.vy = (dx / d) * sp;
    });
    starList.current = [{ x: cx, y: cy, m: 1.6, born: performance.now() / 1000 }];
    setStars(1);
    nudge(2.5, "BUILT A SOLAR SYSTEM");
  };

  const clearStars = () => {
    starList.current = [];
    setStars(0);
    nudge(1, "COLLAPSED STARS");
  };

  return (
    <SectionShell
      id="gravity"
      index="03"
      kicker="orbital mechanics sandbox"
      title="Your cursor is a planet."
      blurb="Four hundred-odd bodies fall toward whatever you point at. Hold the pointer down and it becomes a repulsor; tap quickly to plant a permanent star. Plant a few, then hit orbit and watch the whole thing settle into a system."
      accent="#35e39f"
      controls={
        <>
          <button className="btn" onClick={orbitAll} type="button">
            make a system
          </button>
          <button className="btn" onClick={chaos} type="button">
            chaos
          </button>
          <button className="btn" onClick={clearStars} type="button">
            clear stars ({stars})
          </button>
        </>
      }
    >
      <div ref={wrapRef} className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="panel order-2 flex flex-col gap-4 p-4 lg:order-1">
          <div>
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">
              bodies
            </span>
            <input
              type="range"
              min={60}
              max={1200}
              step={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              onPointerUp={() => nudge(1, "TUNED")}
              className="mt-2"
            />
            <span className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-mint">
              {count}
            </span>
          </div>
          <div>
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">
              gravitational constant
            </span>
            <input
              type="range"
              min={0}
              max={4}
              step={0.05}
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              onPointerUp={() => nudge(1, "TUNED")}
              className="mt-2"
            />
            <span className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-sky">
              {gravity.toFixed(2)}G
            </span>
          </div>
          <div>
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ash uppercase">
              motion blur
            </span>
            <input
              type="range"
              min={0.02}
              max={0.6}
              step={0.01}
              value={trail}
              onChange={(e) => setTrail(Number(e.target.value))}
              onPointerUp={() => nudge(1, "TUNED")}
              className="mt-2"
            />
            <span className="font-display text-[1.5rem] leading-none font-extrabold tabular-nums text-amber">
              {Math.round((1 - trail / 0.6) * 100)}%
            </span>
          </div>

          <div className="mt-auto space-y-1 border-t border-bone/10 pt-3">
            <div className="flex justify-between font-mono text-[0.58rem] tracking-[0.16em] text-ash uppercase">
              <span>mean velocity</span>
              <span className="text-bone tabular-nums">{energy}px/s</span>
            </div>
            <div className="flex justify-between font-mono text-[0.58rem] tracking-[0.16em] text-ash uppercase">
              <span>stars planted</span>
              <span className="text-bone tabular-nums">{stars}</span>
            </div>
            <div className="mt-2 flex gap-2 font-mono text-[0.52rem] tracking-[0.12em] text-ash uppercase">
              <span className="flex items-center gap-1"><i className="h-1.5 w-3 bg-mint" />slow</span>
              <span className="flex items-center gap-1"><i className="h-1.5 w-3 bg-amber" />warm</span>
              <span className="flex items-center gap-1"><i className="h-1.5 w-3 bg-coral" />fast</span>
            </div>
          </div>
        </aside>

        <div className="panel relative order-1 overflow-hidden lg:order-2">
          <canvas
            ref={canvasRef}
            className="block h-[52vh] min-h-[320px] w-full cursor-crosshair touch-none"
            onPointerMove={(e) => {
              const p = localPoint(e);
              pointer.current.x = p.x;
              pointer.current.y = p.y;
              pointer.current.inside = true;
            }}
            onPointerDown={(e) => {
              const p = localPoint(e);
              pointer.current.down = true;
              downAt.current = { x: p.x, y: p.y, t: performance.now() };
            }}
            onPointerUp={(e) => {
              const p = localPoint(e);
              pointer.current.down = false;
              const quick = performance.now() - downAt.current.t < 320;
              const near = Math.hypot(p.x - downAt.current.x, p.y - downAt.current.y) < 12;
              if (quick && near && starList.current.length < 9) {
                starList.current.push({
                  x: p.x,
                  y: p.y,
                  m: 1 + Math.random() * 1.1,
                  born: performance.now() / 1000,
                });
                setStars(starList.current.length);
                nudge(2, "PLANTED A STAR");
                track("starsPlanted");
              }
            }}
            onPointerLeave={() => {
              pointer.current.inside = false;
              pointer.current.down = false;
            }}
          />
          <div className="pointer-events-none absolute top-3 left-3 font-mono text-[0.58rem] tracking-[0.2em] text-ash uppercase">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-mint blink" />
            tap = plant star · hold = repel
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
