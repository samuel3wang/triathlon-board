/** Shape of the board JSON files served from `public/data/`. */

export type Category = 'male' | 'female' | 'kona'
export type Distance = 'full' | 'half'
export type Gender = 'male' | 'female'

/** One row exactly as it is written by hand in `public/data/*.json`. */
export interface Athlete {
  name: string
  totalTime: string
  swimTime: string
  bikeTime: string
  runTime: string
  raceName: string
  /** Transitions — absent on most historical rows. Displayed summed as one T1+T2 column. */
  t1?: string
  t2?: string
  /** Only meaningful on the Kona board, where rows are grouped by it. */
  gender?: Gender
  /** Present on some rows, not displayed yet. */
  birthYear?: number
  date?: string
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

/** Time columns, all pre-parsed to seconds by `normalizeBoard` so sorting never parses. */
export type TimeField =
  | 'totalTime'
  | 'swimTime'
  | 'transitionTime'
  | 'bikeTime'
  | 'runTime'

/**
 * A row after `normalizeBoard`: rank and the merged transition column are derived,
 * never stored in the JSON.
 */
export interface ViewAthlete extends Athlete {
  /** Position by `totalTime`, ties sharing a rank. Undefined on the Kona board, which counts per gender group. */
  rank?: number
  /** `t1 + t2`, formatted for display; empty when the row has neither. */
  transitionTime: string
  /** Every time column in seconds; missing/unparseable values are `Infinity` so they sort last. */
  secs: Record<TimeField, number>
}

export interface ViewBoard extends Omit<Board, 'athletes'> {
  athletes: ViewAthlete[]
}

/** Columns the table can sort by. */
export type SortField = 'name' | TimeField

export type SortDir = 'asc' | 'desc'
