import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { freshDemoState, loginAsGuru, loginAsSiswa } from './helpers.js'

// Regresi WCAG 2.1 AA (Fase 4) — axe-core terhadap halaman utama guru & siswa.
// Baseline saat ditulis: 0 pelanggaran di semua halaman di bawah (lihat
// CHANGES.md untuk rincian perbaikan kontras warna & label ARIA).
async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test.describe('Aksesibilitas (axe-core, WCAG 2.1 AA)', () => {
  test('Landing', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500) // lewati animasi fade-up
    await expectNoViolations(page)
  })

  test('Login', async ({ page }) => {
    await page.goto('/masuk')
    await page.waitForTimeout(500)
    await expectNoViolations(page)
  })

  test('Siswa Beranda & sesi adaptif', async ({ page }) => {
    await freshDemoState(page)
    await loginAsSiswa(page)
    await expectNoViolations(page)

    await page.goto('/siswa/sesi/' + encodeURIComponent('Sistem Persamaan Linear'))
    await page.waitForTimeout(800)
    const startBtn = page.getByRole('button', { name: /Mulai kalibrasi|Lanjutkan sesi/ })
    await startBtn.waitFor({ timeout: 15000 })
    await startBtn.click()
    await page.waitForTimeout(2000)
    await expectNoViolations(page)
  })

  test('Guru Dashboard & Analitik', async ({ page }) => {
    await freshDemoState(page)
    await loginAsGuru(page)
    await expectNoViolations(page)

    await page.goto('/guru/analitik')
    await page.waitForTimeout(800)
    await expectNoViolations(page)
  })
})
