/**
 * Generates android/ios platforms (if missing), builds web, generates native icons/splash, syncs.
 * Location: scripts/setup-native.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('npm', ['run', 'build'])

if (!existsSync('android')) run('npx', ['cap', 'add', 'android'])
if (!existsSync('ios')) run('npx', ['cap', 'add', 'ios'])

run('npx', [
  'capacitor-assets',
  'generate',
  '--ios',
  '--android',
  '--iconBackgroundColor',
  '#03080f',
  '--iconBackgroundColorDark',
  '#03080f',
  '--splashBackgroundColor',
  '#070f18',
  '--splashBackgroundColorDark',
  '#070f18',
])

run('npx', ['cap', 'sync'])
console.log('native:setup complete — open with npm run cap:ios / npm run cap:android')
