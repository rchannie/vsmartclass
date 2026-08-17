// Helper bersama untuk E2E — mode demo saja (lihat playwright.config.js).

export async function freshDemoState(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
}

export async function loginAsGuru(page) {
  await page.goto('/masuk')
  await page.getByRole('button', { name: 'Masuk sebagai Guru' }).click()
  await page.waitForURL('**/guru/**')
  await dismissOnboarding(page)
}

export async function loginAsSiswa(page) {
  await page.goto('/masuk')
  await page.getByRole('button', { name: 'Masuk sebagai Siswa' }).click()
  await page.waitForURL('**/siswa/**')
  await dismissOnboarding(page)
}

export async function dismissOnboarding(page) {
  // isVisible() tidak menunggu (immediate check) — pakai waitFor() supaya
  // modal onboarding yang muncul async sempat ter-render sebelum diperiksa.
  const skip = page.getByRole('button', { name: 'Lewati' })
  const seen = await skip.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)
  if (seen) await skip.click()
}
