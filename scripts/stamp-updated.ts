// Stamps each board's `lastUpdated` with the date that file was last committed,
// so nobody has to maintain it by hand. Run by CI before `npm run build`.
//
// Requires full git history (actions/checkout with fetch-depth: 0) — a shallow
// clone has no commit for most files, and the stamp falls back to today.

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = 'public/data'
const TZ = 'Asia/Taipei' // dates are read by a Taiwanese audience, not CI's UTC

const today = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

const lastCommitDate = (file: string): string | null => {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cd', '--date=short-local', '--', file],
      { encoding: 'utf8', env: { ...process.env, TZ } }
    ).trim()
    return out || null
  } catch {
    return null // not a git repo, or git unavailable
  }
}

let changed = 0
for (const name of readdirSync(DATA_DIR).filter(n => n.endsWith('.json'))) {
  const path = join(DATA_DIR, name)
  const src = readFileSync(path, 'utf8')
  const match = src.match(/"lastUpdated":\s*"([^"]*)"/)
  if (!match) {
    console.warn(`  ${name}: no lastUpdated field, skipped`)
    continue
  }

  const stamp = lastCommitDate(path) ?? today()
  if (match[1] === stamp) continue

  // Replace just this field so the file's hand-written formatting survives.
  writeFileSync(path, src.replace(match[0], `"lastUpdated": "${stamp}"`))
  console.log(`  ${name}: ${match[1]} -> ${stamp}`)
  changed++
}
console.log(`stamp-updated: ${changed} file(s) updated`)
