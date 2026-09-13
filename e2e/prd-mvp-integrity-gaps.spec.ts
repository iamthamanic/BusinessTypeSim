/**
 * Feature e2e: PRD MVP integrity gaps — pending analysis, reveal, cloud offline commit.
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = '.qa/evidence/prd-mvp-integrity-gaps'

async function enterLocalNordkern(
  page: import('@playwright/test').Page,
  options?: { forceCloudUi?: boolean },
) {
  await page.addInitScript((forceCloudUi) => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
    if (forceCloudUi) localStorage.setItem('bt.e2e.force-cloud-ui', '1')
    else localStorage.removeItem('bt.e2e.force-cloud-ui')
  }, options?.forceCloudUi === true)
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

test('analysis pending then reveal after advance', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await enterLocalNordkern(page)

  await nav(page, 'Entscheidung').click()
  await page.getByRole('button', { name: /Weitere Informationen anfordern/ }).click()
  await expect(page.getByRole('heading', { name: 'Analysen anfordern' })).toBeVisible()

  const row = page.locator('.analysis-menu__row').filter({ hasText: 'Profitabilität' }).first()
  await row.getByRole('button', { name: 'Anfordern' }).click()
  await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Läuft · Ergebnis an Tag/)).toBeVisible()
  await page.screenshot({ path: path.join(EVIDENCE, '01-analysis-pending.png'), fullPage: true })

  await nav(page, 'Mehr').click()
  await page.getByRole('button', { name: /vorspulen/i }).click()

  await nav(page, 'Entscheidung').click()
  await page.getByRole('button', { name: /Weitere Informationen anfordern/ }).click()
  await expect(page.getByText('Fertig').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/40 Mio|Deckungsbeitrag|Promotion/i).first()).toBeVisible()
  await page.screenshot({ path: path.join(EVIDENCE, '02-analysis-revealed.png'), fullPage: true })

  expect(errors, `page errors: ${errors.join('; ')}`).toEqual([])
})

test('cloud UI offline disables commit and keeps draft', async ({ page, context }) => {
  await enterLocalNordkern(page, { forceCloudUi: true })
  await expect(page.getByText('Cloud').first()).toBeVisible()

  await nav(page, 'Entscheidung').click()
  await page.getByRole('button', { name: /Entscheidung treffen/ }).click()
  const plan = 'Wir automatisieren Thüringen als Pilot und verhandeln Lidl auf eine Mindestmarge.'
  await page.locator('textarea').first().fill(plan)
  await page.getByRole('button', { name: /Weiter/ }).click()
  await page.locator('textarea').fill('Ziele Marge und Kapazität; Risiko Cash und Lidl-Reaktion.')
  await page.getByRole('button', { name: /Weiter zur Prüfung/ }).click()
  await expect(page.getByText('So haben wir dich verstanden')).toBeVisible({ timeout: 15_000 })

  await context.setOffline(true)
  await expect(page.getByRole('button', { name: /Committen/ })).toBeDisabled()
  await expect(page.getByText(/Offline: Entwurf ist gespeichert/)).toBeVisible()
  await page.screenshot({ path: path.join(EVIDENCE, '03-commit-disabled-offline.png'), fullPage: true })

  await context.setOffline(false)
  await expect(page.getByRole('button', { name: /Committen/ })).toBeEnabled({ timeout: 10_000 })
})

test('scenario card has no nested buttons', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bt.onboarding.seen', '1')
    localStorage.removeItem('business-type:active-run:v1')
  })
  await page.goto('/')
  const card = page.locator('.scenario-pick').filter({ hasText: 'Nordkern Foods' })
  await card.getByRole('button', { name: /Szenario Nordkern Foods/ }).click()
  const nested = await card.locator('button button').count()
  expect(nested).toBe(0)
  await expect(card.getByRole('button', { name: 'Demo starten' })).toBeVisible()
})
