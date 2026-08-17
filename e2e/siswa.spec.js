import { test, expect } from '@playwright/test'
import { freshDemoState, loginAsSiswa } from './helpers.js'

test.describe('Alur siswa (mode demo)', () => {
  test.beforeEach(async ({ page }) => {
    await freshDemoState(page)
  })

  test('bisa masuk dan melihat Beranda dengan kelas & tugas', async ({ page }) => {
    await loginAsSiswa(page)
    await expect(page.getByRole('heading', { name: /Halo, Aisyah/ })).toBeVisible()
    await expect(page.getByText('XI MIPA 2')).toBeVisible()
  })

  test('mengerjakan sesi adaptif: opsi tidak pernah menampilkan kode Bloom sebelum dijawab', async ({ page }) => {
    await loginAsSiswa(page)
    await page.goto('/siswa/sesi/' + encodeURIComponent('Sistem Persamaan Linear'))

    const startBtn = page.getByRole('button', { name: /Mulai kalibrasi|Lanjutkan sesi/ })
    await expect(startBtn).toBeVisible({ timeout: 15000 })
    await startBtn.click()

    await expect(page.getByText(/Soal 1 dari 6/)).toBeVisible({ timeout: 20000 })

    // Regresi keamanan (AUDIT.md §2.2 / Fase 2): tidak ada kode Bloom (C1-C6)
    // di kartu soal SEBELUM opsi dipilih — label baru terbuka setelah dijawab.
    const cardText = await page.locator('.card').first().innerText()
    expect(cardText).not.toMatch(/\bC[1-6]\b/)

    // Pilih opsi terakhir (level tertinggi di jendela soal ini) & kirim jawaban
    const options = page.locator('.card button:has(span.font-mono)')
    await options.last().click()
    await page.getByRole('button', { name: 'Kirim jawaban' }).click()

    // Setelah reveal (async — fase "revealing"): fase justifying (opsi C4+)
    // ATAU langsung feedback modal. isVisible() TIDAK menunggu (immediate
    // check), jadi pakai waitFor() supaya transisi async sempat selesai.
    const justifyBox = page.getByPlaceholder('Jelaskan alasanmu memilih opsi ini…')
    const feedbackNext = page.getByRole('button', { name: /Soal berikutnya|Selesaikan sesi/ })

    const needsJustification = await justifyBox
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)

    if (needsJustification) {
      await justifyBox.fill('Saya menganalisis struktur soal ini dan membandingkan dua pendekatan penyelesaian.')
      await page.getByRole('button', { name: 'Kirim alasan' }).click()
    }
    await expect(feedbackNext).toBeVisible({ timeout: 20000 })
  })

  test('halaman Rekomendasi tampil tanpa error setelah profil ada', async ({ page }) => {
    await loginAsSiswa(page)
    await page.goto('/siswa/rekomendasi')
    await expect(page.getByRole('heading', { name: 'Rekomendasi untukmu' })).toBeVisible({ timeout: 15000 })
  })
})
