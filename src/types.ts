/** Shape of the board JSON files served from `public/data/`. */

export type Category = 'male' | 'female' | 'kona'
export type Distance = 'full' | 'half'
export type Gender = 'male' | 'female'

/**
 * One row exactly as it is written by hand in `public/data/*.json`. Every file
 * carries all of these keys on every row, in this order, so a row can be copied
 * and filled in; unknown values are `""` rather than omitted.
 */
export interface Athlete {
  name: string
  totalTime: string
  swimTime: string
  bikeTime: string
  runTime: string
  raceName: string
  /** Only meaningful on the Kona board, where rows are grouped by it. */
  gender?: Gender
  /** Transitions, `""` when the source had none. Displayed summed as one T1+T2 column. */
  t1: string
  t2: string
  /**
   * Bookkeeping for the maintainer, never rendered: `1` once the result has
   * been checked against a source, `0` (the default for a new row) until then.
   */
  verify: 0 | 1
}

export interface Board {
  title: string
  subtitle: string
  category: Category
  distance?: Distance
  /** Overwritten at deploy time by `scripts/stamp-updated.ts` — not maintained by hand. */
  lastUpdated: string
  notes?: string[]
  athletes: Athlete[]
}

/**
 * Columns the table can sort by. 選手姓名 and T1+T2 are deliberately not
 * sortable, so neither appears here — which is also why `secs` holds exactly
 * these four.
 */
export type SortField = 'totalTime' | 'swimTime' | 'bikeTime' | 'runTime'

/**
 * A row after `normalizeBoard`: rank and the merged transition column are derived,
 * never stored in the JSON.
 */
export interface ViewAthlete extends Athlete {
  /** Position by `totalTime`, ties sharing a rank. Undefined on the Kona board, which counts per gender group. */
  rank?: number
  /** `t1 + t2`, formatted for display; empty when the row has neither. */
  transitionTime: string
  /** Sortable columns pre-parsed to seconds; missing/unparseable values are `Infinity` so they sort last. */
  secs: Record<SortField, number>
}

export interface ViewBoard extends Omit<Board, 'athletes'> {
  athletes: ViewAthlete[]
}

export type SortDir = 'asc' | 'desc'
