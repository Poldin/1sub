import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-credentials'
import { loginAsUser, waitForDashboard } from '../fixtures/test-helpers'

test.describe('Complete User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test('User registration and login flow', async ({ page }) => {
    // Navigate to register page
    await page.click('text=Sign up')
    await expect(page).toHaveURL('/register')

    // Fill registration form
    await page.fill('input[name="email"]', TEST_USERS.user.email)
    await page.fill('input[name="password"]', TEST_USERS.user.password)
    await page.fill('input[name="confirmPassword"]', TEST_USERS.user.password)
    await page.fill('input[name="fullName"]', TEST_USERS.user.fullName)

    // Submit registration
    await page.click('button[type="submit"]')

    // Should redirect to login or dashboard
    await page.waitForURL(/\/login|\/backoffice/)

    // If redirected to login, complete login
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', TEST_USERS.user.email)
      await page.fill('input[name="password"]', TEST_USERS.user.password)
      await page.click('button[type="submit"]')
    }

    // Should be on dashboard/backoffice
    await expect(page).toHaveURL('/backoffice')
  })

  test('User dashboard view and credit balance', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Should be on dashboard
    await expect(page).toHaveURL('/backoffice')

    // Check that user info is displayed
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

    // Check credit balance is displayed
    await expect(page.locator('[data-testid="credit-balance"]')).toBeVisible()
  })

  test('Tool discovery and launch', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Wait for dashboard to load
    await waitForDashboard(page)

    // Should see available tools
    await expect(page.locator('[data-testid="tool-card"]')).toBeVisible()

    // Click on first tool
    await page.click('[data-testid="tool-card"]:first-child')

    // Should show tool details or launch button
    await expect(page.locator('text=Launch Tool')).toBeVisible()
  })

  test('Credit top-up flow', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click on top-up button in sidebar
    await page.click('text=Top Up')

    // Should open top-up dialog
    await expect(page.locator('text=Add Credits')).toBeVisible()

    // Fill amount
    await page.fill('input[name="amount"]', '50')

    // Submit top-up
    await page.click('button[type="submit"]')

    // Should show success message or close dialog
    await expect(page.locator('text=Credits added successfully')).toBeVisible()
  })

  test('Transaction history view', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click on history button in sidebar
    await page.click('text=History')

    // Should open transaction history
    await expect(page.locator('text=Transaction History')).toBeVisible()

    // Should show transaction list
    await expect(page.locator('text=No transactions yet')).toBeVisible()
  })

  test('Share and earn functionality', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click on share and earn button
    await page.click('text=Share & Earn')

    // Should open share dialog
    await expect(page.locator('text=Share & Earn')).toBeVisible()

    // Should show referral link
    await expect(page.locator('input[readonly]')).toBeVisible()
  })

  test('User profile and settings', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click on profile button
    await page.click('[data-testid="user-menu"]')

    // Should show profile options or navigate to profile page
    // This will depend on the actual implementation
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('Logout functionality', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click logout button
    await page.click('text=logout')

    // Should redirect to home page
    await expect(page).toHaveURL('/')

    // Should show login/register links
    await expect(page.locator('text=Sign in')).toBeVisible()
  })

  test('Navigation between pages', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Navigate to different sections
    await page.click('text=Home')
    await expect(page).toHaveURL('/backoffice')

    // Should maintain authentication state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('Responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login first
    await loginAsUser(page)

    // Should show mobile layout
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()

    // Should show hamburger menu
    await expect(page.locator('button:has(svg)')).toBeVisible()
  })
})