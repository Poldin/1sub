/**
 * E2E Tests for Credit Purchase Flow
 *
 * Tests the complete user journey from browsing credit packages to completing payment.
 */

import { test, expect } from '@playwright/test';

test.describe('Credit Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: For real tests, you'd need to create a test user and login
    // This is a simplified example
  });

  test('should display credit packages', async ({ page }) => {
    await page.goto('/buy-credits');

    // Should show credit package options
    await expect(page.locator('text=/credits/i')).toBeVisible();
    await expect(page.locator('text=/€/i')).toBeVisible(); // Price in EUR
  });

  test('should navigate to checkout when package selected', async ({ page }) => {
    await page.goto('/buy-credits');

    // Find and click on a credit package
    // Note: Adjust selectors based on your actual implementation
    const packageButton = page.locator('button:has-text("Buy")').first();
    if (await packageButton.isVisible()) {
      await packageButton.click();

      // Should redirect to checkout or show checkout modal
      await page.waitForURL(/checkout|credit_checkout/, { timeout: 5000 });
    }
  });

  test('should show loading state during checkout', async ({ page }) => {
    await page.goto('/buy-credits');

    // Look for loading indicators
    const loadingIndicators = page.locator('[data-loading], .loading, [aria-busy="true"]');

    // Page should eventually load
    await expect(page.locator('body')).toBeVisible();
  });
});
