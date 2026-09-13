/**
 * E2E: semantic Decision Quality evidence on mobile review widths.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/semantic-decision-quality'

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
  test(`DQ evidence per dimension at ${width}px, outcome separated`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await enterLocalNordkern(page)

    await nav(page, 'Entscheidung').click()
    await page.getByRole('button', { name: /Entscheidung treffen/ }).click()
    await page.locator('textarea').first().fill(
      'Zuerst Pilot in Thüringen, weil Kapazität eng ist. Danach Lidl verhandeln. Falls der Pilot scheitert, stoppen wir Capex.',
    )
    await page.getByRole('button', { name: /Weiter/ }).click()
    await page.locator('textarea').fill(
      'Ziel: Marge und Resilienz. Annahme: Cash-Puffer nötig. Alternative: nur Renegotiation ohne Automatisierung.',
    )
    await page.getByRole('button', { name: /Weiter zur Prüfung/ }).click()
    await expect(page.getByText('So haben wir dich verstanden')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Committen & simulieren/ }).click()
    await expect(page.getByTestId('decision-quality-card')).toBeVisible({ timeout: 20_000 })

    await expect(page.getByTestId('decision-quality-dimensions')).toBeVisible()
    await expect(page.getByTestId('dq-outcome-separation')).toContainText('Outcome')
    await expect(page.getByRole('button', { name: 'Ergebnis' })).toBeVisible()

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width + 1)

    await page.screenshot({
      path: path.join(EVIDENCE, `${width}-dq-evidence.png`),
      fullPage: true,
    })
  })
}
