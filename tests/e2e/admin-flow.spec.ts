import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-credentials'
import { loginAsAdmin, waitForAdminDashboard } from '../fixtures/test-helpers'

test.describe('Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page)
  })

  test('Admin dashboard access and statistics', async ({ page }) => {
    // Should be on admin dashboard
    await expect(page).toHaveURL('/admin')

    // Check that admin dashboard elements are visible
    await expect(page.locator('text=Admin Dashboard')).toBeVisible()
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-credits"]')).toBeVisible()
    await expect(page.locator('[data-testid="average-balance"]')).toBeVisible()

    // Check navigation buttons
    await expect(page.locator('button:has-text("Manage Tools")')).toBeVisible()
    await expect(page.locator('button:has-text("Back to App")')).toBeVisible()
  })

  test('Tools management - CRUD operations', async ({ page }) => {
    // Navigate to tools management
    await page.click('button:has-text("Manage Tools")')
    await expect(page).toHaveURL('/admin/tools')

    // Check that tools list is displayed
    await expect(page.locator('text=Tools Management')).toBeVisible()

    // Should see existing tools
    await expect(page.locator('[data-testid="tool-row"]')).toBeVisible()

    // Create new tool
    await page.click('button:has-text("Add Tool")')
    await expect(page.locator('text=Create New Tool')).toBeVisible()

    // Fill tool form
    await page.fill('input[name="name"]', 'Test Tool')
    await page.fill('textarea[name="description"]', 'A test tool for E2E testing')
    await page.fill('input[name="url"]', 'https://example.com/test-tool')
    await page.fill('input[name="credit_cost_per_use"]', '5')
    await page.check('input[name="is_active"]')

    // Submit form
    await page.click('button:has-text("Create Tool")')

    // Should show success message or close dialog
    await expect(page.locator('text=Tool created successfully')).toBeVisible()
  })

  test('Users management - view and edit users', async ({ page }) => {
    // Navigate to users management
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/admin/users')

    // Check that users list is displayed
    await expect(page.locator('text=Users Management')).toBeVisible()

    // Should see user rows
    await expect(page.locator('tr')).toBeVisible()

    // Test search functionality
    await page.fill('input[placeholder="Search users..."]', TEST_USERS.user.email)
    
    // Should filter results
    await expect(page.locator('tr')).toBeVisible()

    // Test role filter
    await page.selectOption('select', 'user')
    
    // Should show only users with 'user' role
    await expect(page.locator('tr')).toBeVisible()
  })

  test('Usage logs - view system activity', async ({ page }) => {
    // Navigate to usage logs
    await page.goto('/admin/usage-logs')
    await expect(page).toHaveURL('/admin/usage-logs')

    // Check that usage logs are displayed
    await expect(page.locator('text=Usage Logs')).toBeVisible()

    // Should see logs table
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin navigation and breadcrumbs', async ({ page }) => {
    // Start at admin dashboard
    await expect(page).toHaveURL('/admin')

    // Navigate to tools
    await page.click('button:has-text("Manage Tools")')
    await expect(page).toHaveURL('/admin/tools')

    // Use back button
    await page.click('button:has(svg)')
    await expect(page).toHaveURL('/admin')

    // Navigate to users
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/admin/users')

    // Navigate back to dashboard
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
  })

  test('Admin authentication and session', async ({ page }) => {
    // Should be logged in as admin
    await expect(page).toHaveURL('/admin')

    // Refresh page
    await page.reload()

    // Should still be on admin dashboard
    await expect(page).toHaveURL('/admin')

    // Should maintain admin session
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
  })

  test('Admin logout and redirect', async ({ page }) => {
    // Should be on admin dashboard
    await expect(page).toHaveURL('/admin')

    // Click logout (this will depend on the actual implementation)
    // For now, navigate to backoffice and logout from there
    await page.click('button:has-text("Back to App")')
    await expect(page).toHaveURL('/backoffice')

    // Click logout
    await page.click('text=logout')

    // Should redirect to home page
    await expect(page).toHaveURL('/')
  })

  test('Admin access control - non-admin users', async ({ page }) => {
    // First logout admin
    await page.click('button:has-text("Back to App")')
    await page.click('text=logout')

    // Login as regular user
    await page.click('text=Sign in')
    await page.fill('input[name="email"]', TEST_USERS.user.email)
    await page.fill('input[name="password"]', TEST_USERS.user.password)
    await page.click('button[type="submit"]')

    // Try to access admin route
    await page.goto('/admin')

    // Should redirect to backoffice
    await expect(page).toHaveURL('/backoffice')
  })

  test('Admin dashboard statistics accuracy', async ({ page }) => {
    // Should be on admin dashboard
    await expect(page).toHaveURL('/admin')

    // Wait for statistics to load
    await waitForAdminDashboard(page)

    // Check that statistics are displayed
    const totalUsers = await page.locator('[data-testid="total-users"]').textContent()
    const totalCredits = await page.locator('[data-testid="total-credits"]').textContent()
    const averageBalance = await page.locator('[data-testid="average-balance"]').textContent()

    // Should have numeric values
    expect(totalUsers).toMatch(/^\d+$/)
    expect(totalCredits).toMatch(/^\d+\.\d+$/)
    expect(averageBalance).toMatch(/^\d+\.\d+$/)
  })

  test('Admin responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Should be on admin dashboard
    await expect(page).toHaveURL('/admin')

    // Should show mobile layout
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()

    // Statistics should be stacked vertically on mobile
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible()
  })
})