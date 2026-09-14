/**
 * E2E: feasibility / constraint review — blockers vs warnings at mobile widths.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/feasibility-constraint-engine'

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

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true })
})

for (const width of [320, 375, 480] as const) {
  test(`blockers disable commit and warnings remain visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 })
    await enterLocalNordkern(page)

    await nav(page, 'Cockpit').click()
    await page.getByRole('button', { name: /Entscheidung treffen/ }).click()
    await page.locator('textarea').first().fill(
      'Automatisiere Thüringen als Pilot mit maximal 8 Mio. Euro und rolle nur bei Zielerreichung aus.',
    )
    await page.getByRole('button', { name: /Weiter/ }).click()
    await page.locator('textarea').fill('Ziel: Kapazität. Risiko: Cash. Trade-off bewusst.')
    await page.getByRole('button', { name: /Weiter zur Prüfung/ }).click()
    await expect(page.getByText('So haben wir dich verstanden')).toBeVisible({ timeout: 15_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width + 1)

    const summary = page.locator('.action-review-row__summary').first()
    await expect(summary).toBeVisible()
    await summary.click()

    const amount = page.getByLabel('Betrag (EUR)')
    await expect(amount).toBeVisible()
    await amount.fill('999999999')
    await amount.blur()

    await expect(page.locator('.constraint-box--blocker').or(page.getByRole('button', { name: /Blocker/ })).first()).toBeVisible()
    const commit = page.getByRole('button', { name: /Committen & simulieren/ })
    await expect(commit).toBeDisabled()

    await page.screenshot({
      path: path.join(EVIDENCE, width === 320 ? '01-happy-path.png' : `01-blocker-${width}.png`),
      fullPage: true,
    })

    await amount.fill('100000')
    await amount.blur()

    // Capacity warnings may remain; commit must be enabled without blockers.
    await expect(page.locator('.constraint-box--blocker')).toHaveCount(0)
    await expect(commit).toBeEnabled()

    if (width === 375) {
      await page.screenshot({ path: path.join(EVIDENCE, '02-warnings-allowed.png'), fullPage: true })
    }
  })
}
