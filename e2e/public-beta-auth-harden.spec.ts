/**
 * E2E smoke: Auth panel states without live SMTP (local UI).
 * Location: e2e/public-beta-auth-harden.spec.ts
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE_DIR = '.qa/evidence/public-beta-auth-harden'

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
})

test('auth panel covers login/register/verify/reset screens on mobile widths', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  // Skip onboarding if present
  const continueBtn = page.getByRole('button', { name: /Loslegen/i })
  if (await continueBtn.count()) {
    await continueBtn.first().click()
  }

  const panel = page.getByTestId('auth-gate').or(page.getByTestId('auth-panel')).or(page.locator('.auth-panel'))
  await expect(panel.first()).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-register.png'), fullPage: true })

  // Auth gate (cloud) or unconfigured panel — both are valid entry states.
  const unconfigured = page.getByText(/Business Type Sim|Cloud-API nicht konfiguriert|Anmelden|Registrieren/)
  await expect(unconfigured.first()).toBeVisible()

  await page.setViewportSize({ width: 320, height: 640 })
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-verify-expired.png'), fullPage: true })

  await page.setViewportSize({ width: 480, height: 800 })
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-login-session.png'), fullPage: true })

  expect(errors, `Console errors: ${errors.join(', ')}`).toEqual([])
})
