import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'parity-check.spec.ts', // Explicitly match only this file
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1024 }, // Match Xvfb
        launchOptions: {
            slowMo: 1000 // Add slow motion here too just in case
        }
      },
    },
  ],
});
