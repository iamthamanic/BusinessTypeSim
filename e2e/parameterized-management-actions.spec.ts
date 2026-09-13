/**
 * E2E: parameterized ManagementActions — editable review at mobile widths.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/parameterized-management-actions'

async function enterLocalNordkern(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
    localStorage.removeItem('bt.e2e.force-cloud-ui')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wähle dein Unternehmen' })).toBeVisible()
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
  test(`review shows editable params at ${width}px without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 })
    await enterLocalNordkern(page)

    await nav(page, 'Entscheidung').click()
    await page.getByRole('button', { name: /Entscheidung treffen/ }).click()
    await page.locator('textarea').first().fill(
      'Automatisiere Thüringen als Pilot mit maximal 8 Mio. Euro und rolle nur bei Zielerreichung aus.',
    )
    await page.getByRole('button', { name: /Weiter/ }).click()
    await page.locator('textarea').fill('Ziel: Kapazität und Marge. Risiko: Cash und Anlauf.')
    await page.getByRole('button', { name: /Weiter zur Prüfung/ }).click()
    await expect(page.getByText('So haben wir dich verstanden')).toBeVisible({ timeout: 15_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width + 1)

    const summary = page.locator('.action-review-row__summary').first()
    await expect(summary).toBeVisible()
    await summary.click()
    await expect(page.getByLabel(/Parameter/)).toBeVisible()

    const amount = page.getByLabel('Betrag (EUR)')
    if (await amount.count()) {
      await amount.fill('7500000')
      await amount.blur()
      await expect(page.getByText(/Betrag:/)).toBeVisible()
    }

    await page.screenshot({
      path: path.join(EVIDENCE, width === 320 ? '01-review-320.png' : `01-review-${width}.png`),
      fullPage: true,
    })
    if (width === 375) {
      await page.screenshot({ path: path.join(EVIDENCE, '02-params-edited.png'), fullPage: true })
    }
  })
}
