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

`actions/deploy-pages` polls the Pages API every 5s and gives up after 10 minutes — and that ceiling is **not configurable**: the action clamps its own `timeout` input with `Math.min(input, 600000)`. A deploy that overruns it fails no matter what the workflow says, so the deployment itself has to be fast. It was ~12s until the custom domain was set on 2026-08-06, then 4-10 min, then consistently over the ceiling. A custom domain also needs a `CNAME` file in the published artifact (`public/CNAME`), which the site went without until then.

The footer prints `__COMMIT_SHA__`, injected by `define` in `vite.config.ts` from `git rev-parse --short HEAD`. Read it to tell which commit a visitor is actually running: the Pages CDN caches HTML for 10 minutes (`max-age=600`, not configurable), so what a browser receives can lag what Environments → `github-pages` reports as Active. Because the sha ships inside the hashed JS, it can never disagree with the assets around it.

Any runtime asset or data fetch **must** still go through `import.meta.env.BASE_URL`, as `App.tsx` does; it compiles to `` fetch(`./` + file) ``, resolved against the page URL. A bare `/data/...` would 404 under the subpath. The one requirement a relative base adds is a trailing slash on the page URL — GitHub Pages 301s directory URLs to add it, and the app has no client-side router, so nested paths never arise.

### Data contract

`src/types.ts` is the single source of truth for the board JSON shape (`Board`, `Athlete`). Nothing validates the JSON at runtime — the fetch is cast to `Board`, so a malformed data file is a runtime problem, not a compile-time one. Keep `src/types.ts` in step with `public/data/*.json` by hand.

**Adding an athlete = appending one object anywhere in `athletes`.** There is no `rank` field in the JSON and nothing in the file has to be re-ordered or renumbered: `normalizeBoard` (`src/board.ts`) derives everything the table needs, once, right after the fetch.

`src/board.ts` is the whole derivation layer. It runs once per board — never during render or sorting — and returns a `ViewBoard` whose rows carry:

- `rank` — position by `totalTime`, fastest first. Equal times share a rank and the next one skips (1, 2, 2, 4). Rows with no usable `totalTime` sink to the bottom in file order.
- `transitionTime` — `t1 + t2` merged into the single **T1+T2** column the table renders (`—` when the row has neither). The two fields stay separate in the JSON.
- `secs` — the four sortable columns pre-parsed to seconds, so sorting compares numbers and never re-parses a string.

`timeToSeconds` accepts `H:MM:SS`, `MM:SS`, or a bare number of seconds (`"90"` or `90`); anything else is `Infinity` and sorts last. `secondsToTime` prints `M:SS` under an hour, `H:MM:SS` at or above one — so `t1: "3:30"` + `t2: "2:40"` displays as `6:10`.

**Every row in every file carries the same nine keys in the same order** — `name`, `totalTime`, `swimTime`, `bikeTime`, `runTime`, `raceName`, `t1`, `t2`, `verify` (plus `gender` on Kona rows, after `raceName`) — so adding an athlete is copy a row, paste it anywhere in the array, fill it in. Unknown values are `""`, not omitted; `t1: ""` renders exactly like a missing `t1` (`—`), so an incomplete row is safe.

`verify` is the maintainer's own bookkeeping and is never rendered: `0` on every new row, flipped to `1` by hand once that result has been checked against a source. Nothing in the app reads it.

`lastUpdated` is **not** maintained by hand. `scripts/stamp-updated.ts` (run as `npm run stamp` in the deploy workflow, before `npm run build`) overwrites it with the date that data file was last committed, in `Asia/Taipei`. The value sitting in the repo is therefore cosmetic — only the dev server shows it, and `npm run stamp` fixes that locally too. This is why the workflow checks out with `fetch-depth: 0`; a shallow clone has no per-file history and the stamp falls back to today.

One behaviour branches on `category === 'kona'`: those rows are split into 女子/男子 groups by an `athletes[].gender` field (`'female'`/`'male'`), keep their file order, and take their rank from the position within each group. `normalizeBoard` deliberately leaves Kona rows unsorted and their `rank` undefined — it is a finisher list, not a race.

### Sorting

Only 總成績 / 游泳 / 自行車 / 跑步 are sortable — that set *is* `SortField`, and `secs` holds exactly those four. 排名, 選手姓名, T1+T2 and 賽會名稱 are deliberately not clickable. Every sort is therefore a numeric compare on `secs[field]`, never a string parse. Clicking a header cycles asc → desc → unsorted; unsorted means the `normalizeBoard` order, i.e. rank order. `COL_COUNT` is the `colSpan` for group-header rows and must be kept in sync with the number of `<th>` elements (currently 8: 排名 / 選手姓名 / 總成績 / 游泳 / 自行車 / 跑步 / T1+T2 / 賽會名稱, the same set on mobile and desktop).
