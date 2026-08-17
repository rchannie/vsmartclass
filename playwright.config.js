import { defineConfig, devices } from '@playwright/test'

// E2E berjalan terhadap MODE DEMO (localStorage, tanpa Supabase) — deterministik,
// tidak butuh kredensial, dan tidak pernah menyentuh backend produksi/live siapa pun.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      // Paksa mode demo — E2E tidak boleh pernah mengarah ke backend nyata.
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
