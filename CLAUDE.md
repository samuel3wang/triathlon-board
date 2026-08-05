# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server (Vite)
npm run build    # production build to dist/
npm run preview  # serve the built dist/
npm run lint     # eslint
```

There is no test suite and no TypeScript — plain JSX with ESLint (`eslint.config.js`, react-hooks + react-refresh).

## What this is

A static, data-only leaderboard for Taiwanese triathlon results (超鐵 226km / 半超鐵 113km / Kona finishers). There is no backend: every board is a JSON file under `public/data/`, fetched at runtime. New results arrive via a Google Form (linked from the header) and are hand-merged into those JSON files — most commits in this repo are exactly that (e.g. "update men 226 rank 21").

All UI copy is Traditional Chinese.

## Architecture

- `src/App.jsx` — owns the `BOARDS` array (tab label → JSON filename), the active-tab state, and the fetch. Adding a board = drop a JSON file in `public/data/` + add one entry to `BOARDS`.
- `src/components/Leaderboard.jsx` — the entire table: search, three-state column sorting, rank badges, optional gender grouping, notes.

### Deployment / base path

`vite.config.js` sets `base: '/triathlon-board/'` because the site deploys to GitHub Pages (`.github/workflows/deploy.yml`, on push to `master`). Any runtime asset or data fetch **must** be prefixed with `import.meta.env.BASE_URL`, as `App.jsx` does — a bare `/data/...` path works in dev and 404s in production.

### Data contract

Board file shape:

```json
{ "title": "...", "subtitle": "...", "category": "male|female|kona",
  "distance": "full|half", "lastUpdated": "YYYY-MM-DD",
  "notes": ["..."], "athletes": [...] }
```

Athlete fields the table renders: `rank`, `name`, `totalTime`, `swimTime`, `t1`, `bikeTime`, `t2`, `runTime`, `raceName`. `t1`/`t2` are optional and render as `—` when absent (most existing rows have no splits for them). Some rows also carry `birthYear` / `date`, which nothing displays yet.

Two behaviours branch on `category === 'kona'`:

- **Normal boards**: `rank` is stored in the file and displayed verbatim; the default (unsorted) view is simply the file's array order. So the array must stay sorted by `rank`, and inserting an athlete means renumbering every entry below them.
- **Kona board**: rows are split into 女子/男子 groups by an `athletes[].gender` field (`'female'`/`'male'`) and rank is computed as the position within each group, ignoring any stored `rank`.

### Sorting

`TIME_FIELDS` names the columns parsed by `timeToSeconds` (`H:MM:SS` or `MM:SS`); unparseable or missing values sort to the end via `Infinity`. Everything else compares as lowercased strings. Clicking a header cycles asc → desc → unsorted (back to file order). `COL_COUNT` is the `colSpan` for group-header rows and must be kept in sync with the number of `<th>` elements.
