import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { useInView } from "../lib/hooks";

type Props = {
  id: string;
  index: string;
  kicker: string;
  title: string;
  blurb: string;
  accent: string;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionShell({
  id,
  index,
  kicker,
  title,
  blurb,
  accent,
  controls,
  children,
  className,
}: Props) {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "relative scroll-mt-20 border-t border-bone/10 px-4 py-14 sm:px-7 md:py-20",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 right-2 select-none font-display text-[8rem] leading-none font-extrabold text-bone/[0.035] sm:text-[13rem]"
      >
        {index}
      </span>

      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className={cn("reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", inView && "is-in")}>
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 font-mono text-[0.68rem] tracking-[0.28em] text-ash uppercase">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
              />
              {index} — {kicker}
            </div>
            <h2 className="mt-3 font-display text-[clamp(2.1rem,5.6vw,3.6rem)] leading-[0.95] font-extrabold tracking-tight">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ash">{blurb}</p>
          </div>
          {controls ? (
            <div
              className={cn("reveal flex flex-wrap items-center gap-2", inView && "is-in")}
              style={{ transitionDelay: "120ms" }}
            >
              {controls}
            </div>
          ) : null}
        </div>

        <div
          className={cn("reveal mt-8", inView && "is-in")}
          style={{ transitionDelay: "180ms" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
