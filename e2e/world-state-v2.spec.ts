/**
 * E2E: World State V2 — company shows player-safe entity summaries, no spoilers.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/world-state-v2'

async function enterLocalNordkern(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
  })
  await page.goto('/')
  const card = page.locator('.scenario-pick').filter({ hasText: 'Nordkern Foods' })
  await card.getByRole('button', { name: /Szenario Nordkern Foods/ }).click()
  await card.getByRole('button', { name: 'Demo starten' }).click()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible({ timeout: 15_000 })
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true })
})

test('company view shows player-safe world entities', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await enterLocalNordkern(page)
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Unternehmen', exact: true }).click()
  await expect(page.getByText(/Kunden|Werke|Projekte|Standorte/i).first()).toBeVisible({ timeout: 10_000 })
  const body = await page.locator('body').innerText()
  expect(body.toLowerCase()).not.toMatch(/system_only|researchable.?truth|hidden.?metric/i)
  await page.screenshot({ path: path.join(EVIDENCE, '01-company-entities.png'), fullPage: true })
  await page.screenshot({ path: path.join(EVIDENCE, '02-no-spoiler-in-ui.png'), fullPage: true })
})
