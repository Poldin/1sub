import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-credentials'
import { loginAsUser, waitForDashboard } from '../fixtures/test-helpers'

test.describe('Edge Cases and Error Handling', () => {
  test('Insufficient credits scenario', async ({ page }) => {
    // Login with user who has low credits
    await loginAsUser(page)

    // Wait for tools to load
    await waitForDashboard(page)

    // Try to launch a tool that costs more than available credits
    const toolCards = page.locator('[data-testid="tool-card"]')
    const expensiveTool = toolCards.filter({ hasText: '25 credits' }).first()
    
    if (await expensiveTool.isVisible()) {
      await expensiveTool.locator('button:has-text("Launch Tool")').click()

      // Should show insufficient credits error or handle gracefully
      await expect(page.locator('text=Insufficient credits')).toBeVisible()
      
      // Tool should remain launchable (not disabled)
      await expect(expensiveTool.locator('button:has-text("Launch Tool")')).toBeEnabled()
    }
  })

  test('Invalid tool access with expired token', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Wait for tools to load
    await waitForDashboard(page)

    // Try to access tool with invalid token
    const invalidToken = 'invalid-token-123'
    const response = await page.request.get(`/api/v1/verify-token?token=${invalidToken}`)
    
    expect(response.status()).toBe(401)
  })

  test('Network failure during tool launch', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Wait for tools to load
    await waitForDashboard(page)

    // Simulate network failure
    await page.route('**/api/v1/tools/launch', route => route.abort())

    // Try to launch a tool
    await page.click('[data-testid="tool-card"]:first-child button:has-text("Launch Tool")')

    // Should handle network error gracefully
    await expect(page.locator('text=Network error')).toBeVisible()
  })

  test('Session expiration during use', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Wait for dashboard
    await expect(page).toHaveURL('/backoffice')

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies()

    // Try to perform an action
    await page.click('[data-testid="tool-card"]:first-child')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('Form validation errors', async ({ page }) => {
    // Try to register with invalid data
    await page.goto('/register')
    
    // Submit empty form
    await page.click('button[type="submit"]')

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('Duplicate email registration', async ({ page }) => {
    // Try to register with existing email
    await page.goto('/register')
    
    await page.fill('input[name="email"]', TEST_USERS.user.email)
    await page.fill('input[name="password"]', 'newpassword123')
    await page.fill('input[name="confirmPassword"]', 'newpassword123')
    await page.fill('input[name="fullName"]', 'New User')
    
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Email already exists')).toBeVisible()
  })

  test('Password mismatch during registration', async ({ page }) => {
    // Try to register with mismatched passwords
    await page.goto('/register')
    
    await page.fill('input[name="email"]', 'newuser@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'differentpassword')
    await page.fill('input[name="fullName"]', 'New User')
    
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('Invalid login credentials', async ({ page }) => {
    // Try to login with invalid credentials
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('Tool launch with invalid tool ID', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Try to launch non-existent tool
    const response = await page.request.post('/api/v1/tools/launch', {
      data: { toolId: 'invalid-tool-id' }
    })

    expect(response.status()).toBe(404)
  })

  test('Credit top-up with invalid amount', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Click on top-up button
    await page.click('text=Top Up')

    // Try to submit invalid amount
    await page.fill('input[name="amount"]', '-10')
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=Amount must be positive')).toBeVisible()
  })

  test('Concurrent tool launches', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Wait for tools to load
    await waitForDashboard(page)

    // Try to launch multiple tools simultaneously
    const toolCards = page.locator('[data-testid="tool-card"]')
    const firstTool = toolCards.first()
    const secondTool = toolCards.nth(1)

    if (await secondTool.isVisible()) {
      // Launch both tools quickly
      await Promise.all([
        firstTool.locator('button:has-text("Launch Tool")').click(),
        secondTool.locator('button:has-text("Launch Tool")').click()
      ])

      // Should handle concurrent requests gracefully
      await expect(page.locator('[data-testid="tool-card"]')).toBeVisible()
    }
  })

  test('Large data handling', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Navigate to transaction history
    await page.click('text=History')

    // Should handle large transaction lists
    await expect(page.locator('text=Transaction History')).toBeVisible()
  })

  test('Browser back/forward navigation', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Navigate to different pages
    await page.goto('/backoffice')
    await page.goto('/')

    // Use browser back button
    await page.goBack()

    // Should maintain proper state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('Page refresh during operation', async ({ page }) => {
    // Login first
    await loginAsUser(page)

    // Start a tool launch
    await waitForDashboard(page)
    await page.click('[data-testid="tool-card"]:first-child')

    // Refresh page during operation
    await page.reload()

    // Should handle refresh gracefully
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('Unicode and special characters', async ({ page }) => {
    // Try to register with special characters
    await page.goto('/register')
    
    await page.fill('input[name="email"]', 'test+unicode@example.com')
    await page.fill('input[name="password"]', 'p@ssw0rd!@#$%')
    await page.fill('input[name="confirmPassword"]', 'p@ssw0rd!@#$%')
    await page.fill('input[name="fullName"]', 'Tëst Üser')
    
    await page.click('button[type="submit"]')

    // Should handle special characters properly
    await expect(page).toHaveURL('/backoffice')
  })
})