import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/')
  })

  test('should complete registration flow', async ({ page }) => {
    // Click on register link
    await page.click('text=Sign up')
    
    // Fill registration form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.fill('input[name="fullName"]', 'Test User')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/backoffice')
    
    // Should show user info
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('should complete login flow', async ({ page }) => {
    // Click on login link
    await page.click('text=Sign in')
    
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/backoffice')
    
    // Should show user info
    await expect(page.locator('text=test@example.com')).toBeVisible()
  })

  test('should complete tool launch flow', async ({ page }) => {
    // First login
    await page.click('text=Sign in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/backoffice')
    
    // Should see tool cards with launch buttons
    await expect(page.locator('text=Launch Tool')).toBeVisible()
    
    // Click on first launch button
    await page.click('button:has-text("Launch Tool") >> nth=0')
    
    // Should open new tab with tool URL
    const newPage = await page.waitForEvent('popup')
    await expect(newPage.url()).toContain('example-tool-')
    await expect(newPage.url()).toContain('token=')
    await expect(newPage.url()).toContain('userId=')
    
    await newPage.close()
  })

  test('should complete logout flow', async ({ page }) => {
    // First login
    await page.click('text=Sign in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await expect(page).toHaveURL('/backoffice')
    
    // Click logout button
    await page.click('button:has-text("logout")')
    
    // Should redirect to home
    await expect(page).toHaveURL('/')
    
    // Should not show user info
    await expect(page.locator('text=test@example.com')).not.toBeVisible()
  })

  test('should show credit balance on dashboard', async ({ page }) => {
    // Login
    await page.click('text=Sign in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await expect(page).toHaveURL('/backoffice')
    
    // Should show credit balance (mock data shows 0)
    await expect(page.locator('text=0')).toBeVisible()
  })

  test('should handle invalid login credentials', async ({ page }) => {
    await page.click('text=Sign in')
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })
})

