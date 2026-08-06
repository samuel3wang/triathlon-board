/**
 * Turns a hand-written board JSON into what the table renders.
 *
 * Runs exactly once per board, right after the fetch — never during render or
 * sorting. Everything the table needs is precomputed here and carried on the
 * row (trading a little memory for zero work later):
 *
 * - `rank`   — derived from `totalTime`, so a new athlete can be appended
 *              anywhere in the file without renumbering anyone.
 * - `transitionTime` — `t1 + t2` merged into the single column the table shows.
 * - `secs`   — every time column parsed to seconds, so a header click sorts
 *              numbers instead of re-parsing `H:MM:SS` strings on every compare.
 */

import type { Board, ViewAthlete, ViewBoard } from './types'

/**
 * Accepts `H:MM:SS`, `MM:SS`, or a bare number of seconds (`"90"` / `90`).
 * Anything unparseable becomes `Infinity`, which sorts to the end.
 */
export const timeToSeconds = (t: string | number | undefined): number => {
  if (typeof t === 'number') return Number.isFinite(t) ? t : Infinity
  if (!t || typeof t !== 'string') return Infinity
  const parts = t.split(':').map(Number)
  if (parts.some(Number.isNaN)) return Infinity
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return Infinity
}

/** `M:SS` under an hour, `H:MM:SS` at or above one — transitions are almost always the former. */
export const secondsToTime = (total: number): string => {
  if (!Number.isFinite(total) || total < 0) return ''
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

const toViewAthlete = (a: ViewAthlete | Board['athletes'][number]): ViewAthlete => {
  const t1 = timeToSeconds(a.t1)
  const t2 = timeToSeconds(a.t2)
  const hasT1 = Number.isFinite(t1)
  const hasT2 = Number.isFinite(t2)
  const transition = hasT1 || hasT2 ? (hasT1 ? t1 : 0) + (hasT2 ? t2 : 0) : Infinity

  return {
    ...a,
    transitionTime: Number.isFinite(transition) ? secondsToTime(transition) : '',
    secs: {
      totalTime: timeToSeconds(a.totalTime),
      swimTime: timeToSeconds(a.swimTime),
      transitionTime: transition,
      bikeTime: timeToSeconds(a.bikeTime),
      runTime: timeToSeconds(a.runTime),
    },
  }
}

/**
 * Ranks by `totalTime`, fastest first. Equal times share a rank and the next
 * one skips (1, 2, 2, 4); rows with no usable time keep their file order at the
 * bottom and are numbered sequentially rather than all tying on `Infinity`.
 */
const assignRanks = (rows: ViewAthlete[]): void => {
  let lastSecs = NaN
  let lastRank = 0
  rows.forEach((row, i) => {
    const secs = row.secs.totalTime
    if (!Number.isFinite(secs) || secs !== lastSecs) {
      lastRank = i + 1
      lastSecs = secs
    }
    row.rank = lastRank
  })
}

export const normalizeBoard = (raw: Board): ViewBoard => {
  const athletes = (raw.athletes ?? []).map(toViewAthlete)

  if (raw.category === 'kona') {
    // Kona is a finisher list, not a race: rank is the position within each
    // gender group, computed by the table. Leave file order alone.
    return { ...raw, athletes }
  }

  // Array.prototype.sort is stable, so rows with identical times stay in file order.
  athletes.sort((a, b) => a.secs.totalTime - b.secs.totalTime)
  assignRanks(athletes)
  return { ...raw, athletes }
}
