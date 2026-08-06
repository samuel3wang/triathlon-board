# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (Vite)
npm run typecheck  # tsc -b, no emit
npm run build      # typecheck + production build to dist/
npm run preview    # serve the built dist/
npm run lint       # eslint
npm run stamp      # rewrite each board's lastUpdated from git history (CI does this)
```

There is no test suite. TypeScript is `strict`, and Vite only strips types — `npm run build` runs `tsc -b` first, so type errors do fail the build. `tsconfig.app.json` covers `src/` (DOM libs), `tsconfig.node.json` covers `vite.config.ts` and `scripts/` (Node libs).

**TypeScript is pinned to 6.x on purpose.** TS 7 (the native compiler) is released, but `typescript-eslint` does not support it yet and `npm run lint` hard-fails on TS 7. Revisit once typescript-eslint ships TS 7 support.

## What this is

A static, data-only leaderboard for Taiwanese triathlon results (超鐵 226km / 半超鐵 113km / Kona finishers). There is no backend: every board is a JSON file under `public/data/`, fetched at runtime. New results arrive via a Google Form (linked from the header) and are hand-merged into those JSON files — most commits in this repo are exactly that (e.g. "update men 226 rank 21").

All UI copy is Traditional Chinese.

## Architecture

- `src/App.jsx` — owns the `BOARDS` array (tab label → JSON filename), the active-tab state, and the fetch. Adding a board = drop a JSON file in `public/data/` + add one entry to `BOARDS`.
- `src/components/Leaderboard.jsx` — the entire table: search, three-state column sorting, rank badges, optional gender grouping, notes.

### Deployment / base path

The site deploys to GitHub Pages (`.github/workflows/deploy.yml`, on push to `master`), which serves it either from `samuel3wang.github.io/triathlon-board/` or from the root of a custom domain, depending on what Settings → Pages currently points at.

`vite.config.ts` therefore sets `base: './'`, so one build is correct in both places and moving between them needs no rebuild. An absolute base breaks every asset the moment the site moves — that failure mode cost a day once.

Any runtime asset or data fetch **must** still go through `import.meta.env.BASE_URL`, as `App.tsx` does; it compiles to `` fetch(`./` + file) ``, resolved against the page URL. A bare `/data/...` would 404 under the subpath. The one requirement a relative base adds is a trailing slash on the page URL — GitHub Pages 301s directory URLs to add it, and the app has no client-side router, so nested paths never arise.

### Data contract

`src/types.ts` is the single source of truth for the board JSON shape (`Board`, `Athlete`). Nothing validates the JSON at runtime — the fetch is cast to `Board`, so a malformed data file is a runtime problem, not a compile-time one. Keep `src/types.ts` in step with `public/data/*.json` by hand.

`t1`/`t2` are optional and render as `—` when absent (most historical rows have no transition splits). Some rows carry `birthYear` / `date`, which nothing displays yet.

`lastUpdated` is **not** maintained by hand. `scripts/stamp-updated.mjs` (run as `npm run stamp` in the deploy workflow, before `npm run build`) overwrites it with the date that data file was last committed, in `Asia/Taipei`. The value sitting in the repo is therefore cosmetic — only the dev server shows it. This is why the workflow checks out with `fetch-depth: 0`; a shallow clone has no per-file history and the stamp falls back to today.

Two behaviours branch on `category === 'kona'`:

- **Normal boards**: `rank` is stored in the file and displayed verbatim; the default (unsorted) view is simply the file's array order. So the array must stay sorted by `rank`, and inserting an athlete means renumbering every entry below them.
- **Kona board**: rows are split into 女子/男子 groups by an `athletes[].gender` field (`'female'`/`'male'`) and rank is computed as the position within each group, ignoring any stored `rank`.

### Sorting

`TIME_FIELDS` names the columns parsed by `timeToSeconds` (`H:MM:SS` or `MM:SS`); unparseable or missing values sort to the end via `Infinity`. Everything else compares as lowercased strings. Clicking a header cycles asc → desc → unsorted (back to file order). `COL_COUNT` is the `colSpan` for group-header rows and must be kept in sync with the number of `<th>` elements.
