/**
 * E2E: Nexora 36m campaign opening on Home.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/nexora-36m-campaign'

async function enterLocalNexora(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
    localStorage.removeItem('bt.e2e.force-cloud-ui')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wähle dein Unternehmen' })).toBeVisible({
    timeout: 15_000,
  })
  const card = page.locator('.scenario-pick').filter({ hasText: 'Nexora' })
  await card.getByRole('button', { name: /Szenario Nexora/ }).click()
  await card.getByRole('button', { name: 'Demo starten' }).click()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible({ timeout: 15_000 })
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true })
})

for (const width of [320, 375, 480] as const) {
  test(`Nexora campaign panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await enterLocalNexora(page)
    await expect(page.getByTestId('campaign-panel')).toBeVisible()
    await expect(page.getByTestId('campaign-active-situation')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Internes Churn-Signal')
    await page.screenshot({ path: path.join(EVIDENCE, `${width}-home.png`), fullPage: true })
  })
}
