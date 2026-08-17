import { test, expect } from '@playwright/test'
import { freshDemoState, loginAsGuru } from './helpers.js'

test.describe('Alur guru (mode demo)', () => {
  test.beforeEach(async ({ page }) => {
    await freshDemoState(page)
  })

  test('bisa masuk dan melihat Dashboard dengan roster kelas', async ({ page }) => {
    await loginAsGuru(page)
    await expect(page.getByRole('heading', { name: /Halo, Ratna/ })).toBeVisible()
    await expect(page.getByText('Aktivitas siswa')).toBeVisible()
  })

  test('membuat workspace baru menampilkan kode undangan', async ({ page }) => {
    await loginAsGuru(page)
    await page.getByRole('button', { name: 'Buat' }).click()
    // Catatan: form ini belum memakai htmlFor/id (lihat AUDIT.md Fase 4 — a11y),
    // jadi getByLabel belum bisa dipakai; pilih lewat placeholder untuk saat ini.
    await page.getByPlaceholder('XI MIPA 2').fill('X IPA 9')
    await page.getByPlaceholder('Matematika').fill('Fisika')
    await page.getByRole('button', { name: 'Buat workspace' }).click()
    await expect(page.getByText(/VSC-[A-Z0-9]{4}/).first()).toBeVisible({ timeout: 10000 })
  })

  test('Analitik menampilkan heatmap & tombol ekspor CSV/PDF', async ({ page }) => {
    await loginAsGuru(page)
    await page.goto('/guru/analitik')
    await expect(page.getByRole('heading', { name: 'Bloom Analytics' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Bloom Class Heatmap')).toBeVisible()
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('Rekomendasi menampilkan strategi mengajar yang disarankan', async ({ page }) => {
    await loginAsGuru(page)
    await page.goto('/guru/rekomendasi')
    await expect(page.getByRole('heading', { name: 'Rekomendasi Strategi Mengajar' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Cocok untuk kelasmu')).toBeVisible()
  })
})
