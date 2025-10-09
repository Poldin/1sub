import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add retry logic for flaky tests
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 45000, // Increase timeout for database operations
  expect: {
    timeout: 10000, // Increase expect timeout
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000, // Increase action timeout for cross-browser compatibility
    navigationTimeout: 45000, // Increase navigation timeout for cross-browser compatibility
    // Add browser-specific settings
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        actionTimeout: 20000, // Firefox needs more time
        navigationTimeout: 60000, // Firefox needs more time for navigation
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit-specific settings
        actionTimeout: 20000, // WebKit needs more time
        navigationTimeout: 60000, // WebKit needs more time for navigation
      },
    },
  ],
  // webServer disabled - using manually started production server
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
  globalSetup: require.resolve('./tests/setup/global-setup'),
  globalTeardown: require.resolve('./tests/setup/global-teardown'),
})
