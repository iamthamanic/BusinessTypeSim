import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const roots = ['src', 'server/src', 'shared/domain']
const forbidden = [
  { pattern: /@ts-ignore|@ts-nocheck/g, label: 'type suppression' },
  { pattern: /\bany\b/g, label: 'explicit any' },
  { pattern: /(sk-[A-Za-z0-9_-]{16,}|service_role\s*[:=]\s*["'][^"']+)/g, label: 'secret-like literal' },
]
const findings = []

async function walk(dir) {
  let entries = []
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name))) {
      const text = await readFile(path, 'utf8')
      for (const rule of forbidden) {
        if (rule.pattern.test(text)) findings.push(`${path}: ${rule.label}`)
        rule.pattern.lastIndex = 0
      }
    }
  }
}

for (const root of roots) await walk(root)
if (findings.length > 0) {
  console.error(findings.join('\n'))
  process.exit(1)
}
console.log('lint: PASS')
