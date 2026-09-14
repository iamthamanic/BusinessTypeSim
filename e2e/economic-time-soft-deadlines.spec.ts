import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/economic-time-soft-deadlines'

async function enterLocalNordkern(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1');
    localStorage.setItem('bt.e2e.allow-local-demo', '1')
    localStorage.removeItem('business-type:active-run:v1')
    localStorage.removeItem('bt.e2e.force-cloud-ui')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wähle dein Unternehmen' })).toBeVisible()
  const card = page.locator('.scenario-pick').filter({ hasText: 'Nordkern Foods' })
  await card.getByRole('button', { name: /Szenario Nordkern Foods/ }).click()
  await card.getByRole('button', { name: 'Szenario starten' }).click()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible({ timeout: 15_000 })
}

function nav(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: label, exact: true })
}

test.beforeAll(() => { fs.mkdirSync(EVIDENCE, { recursive: true }) })

for (const width of [320, 375, 480] as const) {
  test(`deadline days left and analysis states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 })
    await enterLocalNordkern(page)
    await expect(page.getByTestId('home-deadline-banner')).toBeVisible()
    await nav(page, 'Cockpit').click()
    await expect(page.getByTestId('room-hub-mode-quest')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('deadline-banner')).toBeVisible()
    if (width === 320) await page.screenshot({ path: path.join(EVIDENCE, '01-deadline-days-left.png'), fullPage: true })
    await page.getByTestId('room-topbar-info').click()
    await page.getByRole('button', { name: /Weitere Informationen anfordern/ }).click()
    await expect(page.getByRole('heading', { name: 'Analysen anfordern' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anfordern' }).first()).toBeEnabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
    if (width === 375) await page.screenshot({ path: path.join(EVIDENCE, '02-analysis-after-deadline.png'), fullPage: true })
  })
}

test('ledger shows deadline consequences after soft miss advance', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await enterLocalNordkern(page)
  await nav(page, 'Verlauf').click()
  const advance = page.getByRole('button', { name: /Bis Tag \d+ vorspulen/ })
  await expect(advance).toBeVisible()
  await advance.click()
  const again = page.getByRole('button', { name: /Bis Tag \d+ vorspulen/ })
  if (await again.isVisible()) await again.click()
  await expect(page.getByTestId('deadline-consequences')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.locator('[data-ledger-type="economic"]').first()).toBeVisible()
  await page.screenshot({ path: path.join(EVIDENCE, '03-ledger-consequences.png'), fullPage: true })
})
