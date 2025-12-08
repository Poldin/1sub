/**
 * E2E Tests for User Authentication
 */

import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should register new user and login', async ({ page }) => {
    // Generate unique email
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Navigate to register page
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to backoffice
    await expect(page).toHaveURL('/backoffice', { timeout: 10000 });

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Login again
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should be back in backoffice
    await expect(page).toHaveURL('/backoffice', { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible({
      timeout: 5000,
    });

    // Should not redirect
    await expect(page).toHaveURL('/login');
  });

  test('should require authentication for protected pages', async ({ page }) => {
    // Try to access protected page without login
    await page.goto('/backoffice');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
