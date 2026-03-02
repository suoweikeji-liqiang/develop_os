import { defineConfig } from '@playwright/test'

const port = Number(process.env.PORT ?? 3000)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`
const e2eEncryptionKey =
  process.env.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  globalSetup: require.resolve('./e2e/global-setup'),
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ENCRYPTION_KEY: e2eEncryptionKey,
      },
    },
})
