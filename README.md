# The Boredom Machine

A playful browser-based cabinet of interactive experiments: generative art, a synthesised drum sequencer, a reflex arcade, a musical cellular automaton, and a persistent activity ledger.

## Stations

- **Flow Studio** — create flowing particle art, change palettes and parameters, save PNGs, and pin favourites to the gallery.
- **Beat Machine** — build 16-step rhythms from browser-synthesised sounds, adjust tempo, swing and volume, mute tracks, and load or randomise patterns.
- **Reflex Arcade** — a 30-second reaction game with targets, score multipliers, power-ups, personal bests, and keyboard controls.
- **Life Organ** — draw cellular automata, choose rules and presets, and let each generation become a musical sequence.
- **Ledger** — daily dares, badges, pinned artwork, activity log, and JSON export of your progress.

PIP, the small robot companion, reacts to activity throughout the page.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with Canvas, Pointer Events, localStorage, and Web Audio support

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verify a production build

```bash
npm run typecheck
npm run build
npm run preview
```

## Controls

- **1–5** — jump to Flow, Beat, Reflex, Life, and Ledger.
- **Space** — start a Reflex Arcade run when the arcade section is in view.
- **Q W E R / A S D F / Z X C V / U I O P** — activate the 4×4 Reflex Arcade cells during a run.
- **Beat Machine** — click a step to raise its level; Shift-click to lower it; click a track name to mute it.
- **Flow Studio** — move or touch the canvas to stir the flow; tap/click to create a burst.

## Data and privacy

Progress, settings, the activity log, and pinned gallery items are stored locally in your browser. The app does not require an account or send this data to a server. Clearing site storage or using a different browser/device will reset locally stored progress. Use the Ledger JSON export to keep a backup.

## Performance and accessibility

Canvas animation loops pause when their canvas is outside the viewport or when the browser tab is hidden. The app caps canvas pixel density, keeps the Flow Studio particle range bounded, supports reduced-motion preferences, and provides visible keyboard focus styles. Audio starts only after a user interaction and may be unavailable in browsers that do not support Web Audio.

## Project structure

- `src/App.tsx` — page composition and keyboard section shortcuts.
- `src/components/` — stations and shared page sections.
- `src/lib/boredom.ts` — persistent application state and progression.
- `src/lib/game.ts` — statistics, daily dares, badges, and game rules.
- `src/lib/hooks.ts` — visibility-aware canvas loops and reusable React hooks.
- `src/lib/audio.ts` — shared synthesised audio helpers.
- `src/lib/noise.ts` — deterministic value noise for generative art.
- `src/index.css` — design tokens, layout utilities, and motion styles.

## Scripts

- `npm run dev` — start the Vite development server.
- `npm run typecheck` — run TypeScript without emitting files.
- `npm run build` — create a production build.
- `npm run preview` — preview the production build.
