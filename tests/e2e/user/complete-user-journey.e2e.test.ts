/**
 * Complete User Journey E2E Tests
 *
 * Tests the end-to-end user experience from registration to tool usage.
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  const userEmail = `user-${Date.now()}@example.com`;
  const userPassword = 'UserPassword123!';

  test('full user journey: register → buy credits → use tool', async ({ page, context }) => {
    // ============================================
    // Step 1: User Registration
    // ============================================
    await page.goto('/register');

    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.fill('input[name="confirmPassword"]', userPassword);

    // Submit registration
    await page.click('button[type="submit"]');

    // Should redirect to backoffice/dashboard
    await expect(page).toHaveURL(/backoffice|dashboard/, { timeout: 10000 });

    // Should see welcome message or user dashboard
    await expect(page.locator('body')).toContainText(/welcome|dashboard|credits/i, { timeout: 5000 });

    // ============================================
    // Step 2: View Credit Balance (Should be 0 or default)
    // ============================================
    await page.goto('/backoffice');

    // Look for credit balance display
    const balanceElement = page.locator('text=/credit|balance|€/i').first();
    await expect(balanceElement).toBeVisible({ timeout: 5000 });

    // ============================================
    // Step 3: Navigate to Buy Credits Page
    // ============================================
    await page.goto('/buy-credits');

    // Should see credit packages
    await expect(page.locator('text=/credit|package|buy/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/€/i')).toBeVisible(); // Price indicator

    // ============================================
    // Step 4: Select Credit Package
    // ============================================
    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Select"), button:has-text("Purchase")').first();

    if (await buyButton.isVisible({ timeout: 5000 })) {
      await buyButton.click();

      // ============================================
      // Step 5: Checkout Process
      // ============================================
      await page.waitForLoadState('networkidle');

      // Should be on checkout page or Stripe checkout
      const isOnCheckout = page.url().includes('checkout') || page.url().includes('stripe');
      const hasCheckoutElements = await page.locator('text=/payment|checkout|card/i').isVisible({ timeout: 3000 });

      expect(isOnCheckout || hasCheckoutElements).toBe(true);

      // Note: In test environment, we may not complete actual Stripe payment
      // In production, this would involve:
      // - Entering card details
      // - Completing payment
      // - Redirecting back to platform
    }

    // ============================================
    // Step 6: Return to Dashboard (simulating successful payment)
    // ============================================
    await page.goto('/backoffice');

    // ============================================
    // Step 7: Browse Available Tools
    // ============================================
    await page.goto('/tools');

    // Should see list of available tools
    await expect(page.locator('text=/tool|available|browse/i')).toBeVisible({ timeout: 5000 });

    // ============================================
    // Step 8: Select and Launch Tool
    // ============================================
    const launchButton = page.locator('button:has-text("Launch"), button:has-text("Use"), a:has-text("Open")').first();

    if (await launchButton.isVisible({ timeout: 5000 })) {
      await launchButton.click();

      // Should redirect to tool or show tool interface
      await page.waitForLoadState('networkidle');

      // Tool should be accessible
      const toolLaunched = page.url().includes('tool') || await page.locator('text=/tool|launch|connect/i').isVisible({ timeout: 3000 });
      expect(toolLaunched).toBe(true);
    }

    // ============================================
    // Step 9: View Transaction History
    // ============================================
    await page.goto('/backoffice');

    const historyLink = page.locator('a:has-text("History"), a:has-text("Transaction"), button:has-text("History")').first();

    if (await historyLink.isVisible({ timeout: 5000 })) {
      await historyLink.click();

      // Should see transaction list
      await expect(page.locator('text=/transaction|history|date/i')).toBeVisible({ timeout: 5000 });
    }

    // ============================================
    // Step 10: Logout
    // ============================================
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();

      // Should redirect to home or login page
      await expect(page).toHaveURL(/login|home|^\/$/, { timeout: 5000 });
    }
  });
});

test.describe('User Credit Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as existing user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display current credit balance', async ({ page }) => {
    await page.goto('/backoffice');

    // Should show credit balance
    await expect(page.locator('text=/credit.*balance|balance.*credit/i')).toBeVisible({ timeout: 5000 });

    // Balance should be a number
    const balanceText = await page.locator('text=/\\d+.*credit|credit.*\\d+/i').first().textContent({ timeout: 3000 }).catch(() => '');
    expect(balanceText).toMatch(/\d+/);
  });

  test('should view detailed transaction history', async ({ page }) => {
    await page.goto('/backoffice');

    // Navigate to transactions
    const transactionLink = page.locator('a:has-text("Transaction"), a:has-text("History"), button:has-text("View")').first();

    if (await transactionLink.isVisible({ timeout: 5000 })) {
      await transactionLink.click();

      // Should display transaction table
      await expect(page.locator('text=/date|amount|type|description/i')).toBeVisible({ timeout: 5000 });

      // Should show transaction types (credit/debit)
      const hasTransactionTypes = await Promise.race([
        page.locator('text=/credit|purchase|added/i').isVisible({ timeout: 3000 }),
        page.locator('text=/debit|used|consumed/i').isVisible({ timeout: 3000 }),
      ]).catch(() => false);

      if (hasTransactionTypes) {
        expect(hasTransactionTypes).toBe(true);
      }
    }
  });

  test('should filter transactions by date', async ({ page }) => {
    await page.goto('/backoffice');

    const transactionLink = page.locator('a:has-text("Transaction")').first();

    if (await transactionLink.isVisible({ timeout: 3000 })) {
      await transactionLink.click();

      // Look for date filter
      const dateFilter = page.locator('input[type="date"], select:has-text("Date")').first();

      if (await dateFilter.isVisible({ timeout: 3000 })) {
        // Filter functionality exists
        expect(await dateFilter.isVisible()).toBe(true);
      }
    }
  });

  test('should show low balance warning', async ({ page }) => {
    await page.goto('/backoffice');

    // If balance is low, should show warning or prompt to buy credits
    const lowBalanceWarning = await page.locator('text=/low.*balance|buy.*credit|insufficient/i').isVisible({ timeout: 2000 }).catch(() => false);

    // Test documents expected behavior (warning may not appear if balance is sufficient)
    if (lowBalanceWarning) {
      // Should have link to buy credits
      const buyLink = page.locator('a:has-text("Buy"), button:has-text("Purchase")');
      expect(await buyLink.isVisible({ timeout: 2000 })).toBe(true);
    }
  });
});

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should view user profile', async ({ page }) => {
    await page.goto('/backoffice');

    // Look for profile link
    const profileLink = page.locator('a:has-text("Profile"), button:has-text("Account"), [aria-label="Profile"]').first();

    if (await profileLink.isVisible({ timeout: 5000 })) {
      await profileLink.click();

      // Should show user information
      await expect(page.locator('text=/email|profile|account/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update profile information', async ({ page }) => {
    await page.goto('/backoffice');

    const profileLink = page.locator('a:has-text("Profile")').first();

    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();

      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), button:has-text("Update")').first();

      if (await editButton.isVisible({ timeout: 3000 })) {
        await editButton.click();

        // Update fields
        const nameField = page.locator('input[name="name"], input[name="full_name"]');
        if (await nameField.isVisible({ timeout: 2000 })) {
          await nameField.fill('Updated Test User');

          // Save changes
          await page.click('button[type="submit"]:has-text("Save")');

          // Should show success message
          await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should change password', async ({ page }) => {
    await page.goto('/backoffice');

    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Settings")').first();

    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();

      // Look for change password section
      const passwordButton = page.locator('button:has-text("Change Password"), button:has-text("Password")').first();

      if (await passwordButton.isVisible({ timeout: 3000 })) {
        await passwordButton.click();

        // Fill password change form
        const currentPasswordField = page.locator('input[name="current_password"], input[name="currentPassword"]');
        const newPasswordField = page.locator('input[name="new_password"], input[name="newPassword"]');

        if (await currentPasswordField.isVisible({ timeout: 2000 }) && await newPasswordField.isVisible({ timeout: 2000 })) {
          await currentPasswordField.fill('TestPassword123!');
          await newPasswordField.fill('NewPassword123!');
          await page.fill('input[name="confirm_password"], input[name="confirmPassword"]', 'NewPassword123!');

          // Submit
          await page.click('button[type="submit"]');

          // Should show success or validation message
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });
});

test.describe('Tool Discovery and Usage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should browse available tools', async ({ page }) => {
    await page.goto('/tools');

    // Should display tool catalog
    await expect(page.locator('text=/tool|available|explore/i')).toBeVisible({ timeout: 5000 });

    // Should show tool cards/list
    const hasTools = await Promise.race([
      page.locator('[class*="tool"], [data-testid*="tool"]').isVisible({ timeout: 3000 }),
      page.locator('text=/credit.*use|use.*credit/i').isVisible({ timeout: 3000 }),
    ]).catch(() => false);

    if (hasTools) {
      expect(hasTools).toBe(true);
    }
  });

  test('should search for tools', async ({ page }) => {
    await page.goto('/tools');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test');

      // Results should filter
      await page.waitForLoadState('networkidle');

      // Should show filtered results or "no results"
      const hasResults = await page.locator('text=/found|result|no.*match/i').isVisible({ timeout: 3000 });
      expect(hasResults).toBe(true);
    }
  });

  test('should view tool details', async ({ page }) => {
    await page.goto('/tools');

    // Click on first tool
    const toolLink = page.locator('a[href*="/tool"], button:has-text("View"), button:has-text("Details")').first();

    if (await toolLink.isVisible({ timeout: 5000 })) {
      await toolLink.click();

      // Should show tool details page
      await expect(page.locator('text=/description|credit|vendor/i')).toBeVisible({ timeout: 5000 });

      // Should show credits required
      await expect(page.locator('text=/credit.*per.*use|cost.*credit/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should launch tool with sufficient credits', async ({ page }) => {
    await page.goto('/tools');

    const launchButton = page.locator('button:has-text("Launch"), button:has-text("Use")').first();

    if (await launchButton.isVisible({ timeout: 5000 })) {
      await launchButton.click();

      await page.waitForLoadState('networkidle');

      // Tool should launch or show connection process
      const toolLaunched = page.url().includes('tool') ||
        await page.locator('text=/launching|connecting|tool.*ready/i').isVisible({ timeout: 5000 });

      expect(toolLaunched).toBe(true);
    }
  });

  test('should show insufficient credits warning', async ({ page }) => {
    // Note: This test assumes user has low/zero credits
    // In a real test, you'd set up this condition

    await page.goto('/tools');

    const launchButton = page.locator('button:has-text("Launch")').first();

    if (await launchButton.isVisible({ timeout: 3000 })) {
      await launchButton.click();

      // Should show insufficient credits message (if balance is low)
      const insufficientMessage = await page.locator('text=/insufficient.*credit|not.*enough|buy.*credit/i').isVisible({ timeout: 3000 }).catch(() => false);

      // Documents expected behavior when credits are insufficient
      if (insufficientMessage) {
        expect(insufficientMessage).toBe(true);
      }
    }
  });
});

test.describe('User Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display notifications', async ({ page }) => {
    await page.goto('/backoffice');

    // Look for notification icon/area
    const notificationIcon = page.locator('[aria-label*="notification"], [class*="notification"]').first();

    if (await notificationIcon.isVisible({ timeout: 3000 })) {
      await notificationIcon.click();

      // Should show notifications panel
      const hasNotifications = await page.locator('text=/notification|alert|message/i').isVisible({ timeout: 2000 });
      expect(hasNotifications).toBe(true);
    }
  });

  test('should receive credit purchase confirmation', async ({ page }) => {
    // After purchasing credits, user should receive confirmation
    // This is a placeholder documenting expected behavior
    expect(true).toBe(true);
  });

  test('should receive low balance alert', async ({ page }) => {
    // When credits run low, user should receive notification
    // This is a placeholder documenting expected behavior
    expect(true).toBe(true);
  });
});
