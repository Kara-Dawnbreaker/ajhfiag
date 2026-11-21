import { useEffect, useRef, useState } from "react";
import SectionShell from "./SectionShell";
import { usePersistentState } from "../lib/hooks";

const CASES = [
  { id: "CASE-001", title: "The Green Children of Woolpit", place: "Suffolk, England · 12th century", tag: "MEDIEVAL ACCOUNT", hook: "Two children reportedly appeared near the village of Woolpit with green-tinted skin, speaking a language nobody around them understood.", detail: "The story survives in accounts by two medieval writers. The children were said to have come from a strange place they called the land of Saint Martin. The girl eventually adapted to life in England; the boy did not survive.", questions: ["Who were the children, and where had they come from?", "How much of the surviving story is history, folklore, or later embellishment?"], status: "Historical accounts exist; the central events cannot be independently verified." },
  { id: "CASE-002", title: "The Man from Taured", place: "Tokyo, Japan · often dated to 1954", tag: "IDENTITY MYSTERY", hook: "A traveller supposedly presented a passport from a country called Taured — a nation that does not appear on any map.", detail: "The familiar version says the traveller vanished after being questioned. There is no credible evidence for that disappearance story. A real case involving a man using a passport from an invented country may have helped create the legend.", questions: ["How did the Taured story spread and change?", "Which details belong to the documented fraud case, and which were added later?"], status: "The famous parallel-world version is unsupported; its possible real-world inspiration is documented." },
  { id: "CASE-003", title: "Mel's Hole", place: "Near Ellensburg, Washington · reported in 1997", tag: "RADIO LEGEND", hook: "A caller told a late-night radio show about a hole on his land that seemed impossibly deep — and claimed it had unusual effects.", detail: "The story grew through radio interviews and retellings. Reports included objects disappearing into the darkness and strange behaviour around the site, but the location and extraordinary claims have never been independently confirmed.", questions: ["Was there a real hole behind the story?", "Why did the account become such a persistent modern legend?"], status: "Unverified radio account; no independently confirmed site or extraordinary properties." },
  { id: "CASE-004", title: "The Mary Celeste", place: "Atlantic Ocean · 1872", tag: "MARITIME MYSTERY", hook: "A merchant ship was found drifting at sea, still afloat and carrying its cargo — but its captain, family, and crew were gone.", detail: "The vessel was discovered between the Azores and Portugal. The ship was not wrecked, and the people aboard were never found. Several explanations have been proposed, but no account has been proven.", questions: ["Why did everyone leave a seaworthy ship?", "What happened to the people after the vessel was abandoned?"], status: "The abandoned ship is documented; the crew's fate and reason for leaving remain unresolved." },
  { id: "CASE-005", title: "The Taos Hum", place: "Taos, New Mexico · reported since the 1990s", tag: "SOUND ANOMALY", hook: "Some residents describe a persistent low humming sound. Others in the same area hear nothing at all.", detail: "Investigations have explored environmental and industrial sources, but no single explanation has accounted for every report. The experience is real to the people who report it; the source remains uncertain.", questions: ["Why do only some people report hearing it?", "Is there one source, several sources, or more than one kind of experience?"], status: "Reports are documented; a single confirmed source has not been established." },
];

export default function ResearchCases() {
  const [selected, setSelected] = useState<(typeof CASES)[number] | null>(null);
  const [caseProgress, setCaseProgress] = usePersistentState<Record<string, { notes: string; explored: boolean }>>("bm.v4.case-progress", {});
  const exploredCount = CASES.filter((item) => caseProgress[item.id]?.explored).length;
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [selected]);

  return (
    <SectionShell id="cases" index="08" kicker="restricted archive / open investigations" title="Five files. No final answers."
      blurb="A small collection of strange reports, historical puzzles, and unexplained experiences. Read the file, follow the questions, and separate what is known from what is only claimed."
      accent="#58b6ff" controls={<span className="font-mono text-[0.62rem] tracking-[0.16em] text-ash uppercase">5 files · {exploredCount}/5 investigated</span>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CASES.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(item)} aria-haspopup="dialog" className="panel group relative flex min-h-[220px] flex-col p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-sky/50">
          <div className="flex items-center justify-between gap-3 font-mono text-[0.58rem] tracking-[0.16em] text-ash"><span>{item.id}</span><span className="text-sky">{item.tag}</span></div>
          <div className="mt-7 font-display text-xl font-extrabold leading-tight group-hover:text-sky">{item.title}</div>
          <div className="mt-2 font-mono text-[0.58rem] tracking-[0.12em] text-ash">{item.place}</div>
          <p className="mt-4 text-sm leading-relaxed text-bone/75">{item.hook}</p>
          <div className="mt-auto flex items-center justify-between pt-5 font-mono text-[0.6rem] tracking-[0.14em] uppercase"><span className="text-sky">open case file</span><span className={caseProgress[item.id]?.explored ? "text-mint" : "text-ash"}>{caseProgress[item.id]?.explored ? "investigated" : "open"} · 0{index + 1}</span></div>
        </button>)}
      </div>
      {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <article role="dialog" aria-modal="true" aria-labelledby="case-title" aria-describedby="case-detail" className="panel max-h-[88vh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-4 font-mono text-[0.62rem] tracking-[0.18em] text-sky"><span>{selected.id} // {selected.tag}</span><button ref={closeRef} type="button" onClick={() => setSelected(null)} className="btn">close ×</button></div>
          <h3 id="case-title" className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">{selected.title}</h3>
          <p className="mt-2 font-mono text-[0.62rem] tracking-[0.14em] text-ash">{selected.place}</p>
          <p id="case-detail" className="mt-6 text-base leading-relaxed text-bone/85">{selected.detail}</p>
          <div className="mt-7 border-t border-bone/10 pt-5"><div className="font-mono text-[0.62rem] tracking-[0.18em] text-sky uppercase">Questions still open</div><ul className="mt-3 space-y-3">{selected.questions.map((question) => <li key={question} className="flex gap-3 text-sm leading-relaxed text-bone/80"><span className="text-sky">↳</span>{question}</li>)}</ul></div>
          <div className="mt-6 border-l-2 border-amber/60 bg-amber/5 p-4"><div className="font-mono text-[0.58rem] tracking-[0.18em] text-amber uppercase">Evidence note</div><p className="mt-2 text-sm leading-relaxed text-bone/75">{selected.status}</p></div>
          <section className="mt-6 border-t border-bone/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[0.62rem] tracking-[0.18em] text-mint uppercase">Your investigation notes</div>
              <span className="font-mono text-[0.55rem] text-ash">saved on this device</span>
            </div>
            <textarea
              value={caseProgress[selected.id]?.notes ?? ""}
              onChange={(event) => setCaseProgress((current) => ({
                ...current,
                [selected.id]: { notes: event.target.value, explored: current[selected.id]?.explored ?? false },
              }))}
              maxLength={600}
              rows={4}
              placeholder="Record a theory, a clue to verify, or a source you want to check..."
              className="mt-3 w-full resize-y border border-bone/15 bg-ink/70 p-3 text-sm leading-relaxed text-bone placeholder:text-ash/70 focus:border-mint/60 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[0.55rem] text-ash">{(caseProgress[selected.id]?.notes ?? "").length}/600 characters</span>
              <button type="button" className="btn border-mint/40 text-mint" onClick={() => setCaseProgress((current) => ({
                ...current,
                [selected.id]: { notes: current[selected.id]?.notes ?? "", explored: !(current[selected.id]?.explored ?? false) },
              }))}>
                {caseProgress[selected.id]?.explored ? "mark as still investigating" : "mark investigated"}
              </button>
            </div>
          </section>
          <p className="mt-5 font-mono text-[0.58rem] leading-relaxed text-ash">CASE RULE: An unanswered question is not proof of an extraordinary explanation.</p>
        </article>
      </div>}
    </SectionShell>
  );
}
