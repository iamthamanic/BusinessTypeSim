/**
 * E2E: campaign situation panel on Home / Decision / Ledger at mobile widths.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/campaign-runtime'

async function enterLocalNordkern(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
    localStorage.removeItem('bt.e2e.force-cloud-ui')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wähle dein Unternehmen' })).toBeVisible({
    timeout: 15_000,
  })
  const card = page.locator('.scenario-pick').filter({ hasText: 'Nordkern Foods' })
  await card.getByRole('button', { name: /Szenario Nordkern Foods/ }).click()
  await card.getByRole('button', { name: 'Demo starten' }).click()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible({ timeout: 15_000 })
}

function nav(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: label, exact: true })
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true })
})

for (const width of [320, 375, 480] as const) {
  test(`campaign panel visible at ${width}px without hidden triggers`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await enterLocalNordkern(page)

    await expect(page.getByTestId('campaign-panel')).toBeVisible()
    await expect(page.getByTestId('campaign-clock')).toBeVisible()
    await expect(page.getByTestId('campaign-active-situation')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Frühwarnsignal')
    await expect(page.locator('body')).not.toContainText('probabilityBps')

    await page.screenshot({
      path: path.join(EVIDENCE, `${width}-home-situation.png`),
      fullPage: true,
    })

    await nav(page, 'Entscheidung').click()
    await expect(page.getByTestId('campaign-panel')).toBeVisible()
    await page.screenshot({
      path: path.join(EVIDENCE, `${width}-decision-situation.png`),
      fullPage: true,
    })

    await nav(page, 'Mehr').click()
    await expect(page.getByTestId('campaign-panel')).toBeVisible()
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width + 1)
    await page.screenshot({
      path: path.join(EVIDENCE, `${width}-ledger-situation.png`),
      fullPage: true,
    })
  })
}
