import { useCallback, useEffect, useRef, useState } from "react";

/** Respects the user's motion preference. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** One-shot "has this scrolled into view" flag. */
export function useInView<T extends HTMLElement>(rootMargin = "-8% 0px -8% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(true);
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

type StageFrame = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dt: number,
  t: number,
) => void;

/**
 * A DPI-aware canvas + rAF loop that only runs while `running` is true and
 * while the canvas is actually on screen.
 */
export function useCanvasStage(running: boolean, frame: StageFrame) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    };
    resize();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    let raf = 0;
    let last = performance.now();
    const start = last;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w, h } = sizeRef.current;
      frameRef.current(ctx, w, h, dt, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    let io: IntersectionObserver | undefined;
    let visible = true;
    if (running && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const v = entries.some((e) => e.isIntersecting);
          if (v === visible) return;
          visible = v;
          if (v) {
            last = performance.now();
            raf = requestAnimationFrame(loop);
          } else {
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0 },
      );
      io.observe(canvas);
    }

    if (running) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      if (!ro) window.removeEventListener("resize", resize);
      io?.disconnect();
    };
  }, [running]);

  return { canvasRef, size: sizeRef };
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>*#$%&@";

/** Scramble-decode text effect. */
export function useScramble(target: string, speed = 34) {
  const [out, setOut] = useState(target);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setOut(target);
      return;
    }
    let frame = 0;
    let id = 0;
    const total = target.length * 2 + 12;
    const tick = () => {
      frame++;
      const revealed = Math.floor((frame / total) * target.length * 1.35);
      let s = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === " ") {
          s += " ";
        } else if (i < revealed) {
          s += ch;
        } else {
          s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setOut(s);
      if (frame < total) id = window.setTimeout(tick, speed);
      else setOut(target);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [target, speed, reduced]);
  return out;
}

/** State mirrored into localStorage (fails silently in private mode). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** A ticking seconds-since-mount counter, for the "time wasted" readout. */
export function useElapsed(running = true) {
  const [ms, setMs] = useState(0);
  const started = useRef(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setMs(Date.now() - started.current), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return ms;
}

/** Small helper for throttled pointer coords over an element. */
export function usePointer<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const pos = useRef({ x: 0, y: 0, inside: false, down: false });

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    pos.current.x = e.clientX - r.left;
    pos.current.y = e.clientY - r.top;
    pos.current.inside = true;
  }, []);
  const onPointerDown = useCallback(() => {
    pos.current.down = true;
  }, []);
  const onPointerUp = useCallback(() => {
    pos.current.down = false;
  }, []);
  const onPointerLeave = useCallback(() => {
    pos.current.inside = false;
    pos.current.down = false;
  }, []);

  return {
    ref,
    pos,
    handlers: { onPointerMove, onPointerDown, onPointerUp, onPointerLeave },
  };
}
