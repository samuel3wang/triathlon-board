/** Shape of the board JSON files served from `public/data/`. */

export type Category = 'male' | 'female' | 'kona'
export type Distance = 'full' | 'half'
export type Gender = 'male' | 'female'

export interface Athlete {
  /** Stored in the file for ranked boards; ignored on the Kona board, which counts positions per gender group. */
  rank?: number
  name: string
  totalTime: string
  swimTime: string
  bikeTime: string
  runTime: string
  raceName: string
  /** Transitions — absent on most historical rows, rendered as an em dash. */
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

/** Columns the table can sort by. Every one of them holds a string. */
export type SortField =
  | 'name'
  | 'totalTime'
  | 'swimTime'
  | 't1'
  | 'bikeTime'
  | 't2'
  | 'runTime'

export type SortDir = 'asc' | 'desc'
