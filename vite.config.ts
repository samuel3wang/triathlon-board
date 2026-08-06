import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Baked into the bundle so the footer names the exact commit a visitor is
// running. Because the sha ships inside the hashed JS, it can never disagree
// with the assets around it — unlike anything read from the HTML, which the
// Pages CDN may still be serving from an earlier deploy.
const commitSha = (): string => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __COMMIT_SHA__: JSON.stringify(commitSha()) },
  base: './',
})
