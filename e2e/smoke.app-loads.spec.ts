import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE_DIR = '.qa/evidence/smoke'

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
})

test('app loads and shows main shell', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-app-loads.png'), fullPage: true })

  expect(errors, `Console errors: ${errors.join(', ')}`).toEqual([])
})
