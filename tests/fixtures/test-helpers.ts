import { Page, expect } from '@playwright/test'
import { TEST_USERS } from './test-credentials'

export async function loginAsUser(page: Page) {
  await page.goto('/login')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Check if already logged in
  if (await page.locator('[data-testid="user-menu"]').isVisible()) {
    return
  }
  
  // Fill login form with retry logic
  await page.fill('input[name="email"]', TEST_USERS.user.email)
  await page.fill('input[name="password"]', TEST_USERS.user.password)
  
  // Submit form
  await page.click('button[type="submit"]', { force: true })
  
  // Wait for redirect to dashboard with longer timeout
  await expect(page).toHaveURL('/backoffice', { timeout: 30000 })
  
  // Wait for user menu to be visible
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 15000 })
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Check if already logged in as admin
  if (await page.locator('[data-testid="admin-dashboard"]').isVisible()) {
    return
  }
  
  // Fill login form with admin credentials
  await page.fill('input[name="email"]', TEST_USERS.admin.email)
  await page.fill('input[name="password"]', TEST_USERS.admin.password)
  
  // Submit form
  await page.click('button[type="submit"]', { force: true })
  
  // Wait for redirect to admin dashboard with longer timeout
  await expect(page).toHaveURL('/admin', { timeout: 30000 })
  
  // Wait for admin dashboard to be visible
  await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible({ timeout: 15000 })
}

export async function waitForDashboard(page: Page) {
  // Wait for dashboard to load
  await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({ timeout: 20000 })
  
  // Wait for tools to load - look for visible tool cards (desktop version)
  await expect(page.locator('[data-testid="tool-card"]:visible').first()).toBeVisible({ timeout: 20000 })
}

export async function waitForAdminDashboard(page: Page) {
  // Wait for admin dashboard to load
  await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible({ timeout: 20000 })
  
  // Wait for statistics to load
  await expect(page.locator('[data-testid="total-users"]')).toBeVisible({ timeout: 20000 })
}

export async function logout(page: Page) {
  // Click logout button directly (it's in the header)
  await page.click('button[title="Logout"]')
  
  // Wait for redirect to home page with longer timeout
  await expect(page).toHaveURL('/', { timeout: 20000 })
}

export async function clearTestData() {
  // This will be implemented with database cleanup
  console.log('Clearing test data...')
}

export async function seedTestTools() {
  // This will be implemented with database seeding
  console.log('Seeding test tools...')
}

export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout })
}

export async function waitForNavigation(page: Page, url: string | RegExp) {
  await page.waitForURL(url)
}
