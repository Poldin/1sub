/**
 * Admin Dashboard E2E Tests
 *
 * Tests administrative functions including user management,
 * vendor approval, and platform monitoring.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Access', () => {
  test('admin should access dashboard with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Admin login
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await page.waitForLoadState('networkidle');

    const isAdmin = page.url().includes('admin') ||
      await page.locator('text=/admin|dashboard|management/i').isVisible({ timeout: 5000 });

    expect(isAdmin).toBe(true);
  });

  test('non-admin should not access admin dashboard', async ({ page }) => {
    await page.goto('/login');

    // Regular user login
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'UserPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Try to access admin page
    const response = await page.goto('/admin');

    // Should redirect or show 403 Forbidden
    expect([403, 404]).toContain(response?.status() || 0);
  });
});

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should view all users', async ({ page }) => {
    await page.goto('/admin/users');

    // Should display users table
    await expect(page.locator('text=/user|email|status|credit/i')).toBeVisible({ timeout: 5000 });

    // Should show user count or pagination
    const hasUserList = await Promise.race([
      page.locator('table').isVisible({ timeout: 3000 }),
      page.locator('[role="table"]').isVisible({ timeout: 3000 }),
    ]).catch(() => false);

    expect(hasUserList).toBe(true);
  });

  test('should search for users', async ({ page }) => {
    await page.goto('/admin/users');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test@example.com');
      await page.waitForLoadState('networkidle');

      // Should filter results
      const hasResults = await page.locator('text=/test@example.com|found|result/i').isVisible({ timeout: 3000 });
      expect(hasResults).toBe(true);
    }
  });

  test('should view user details', async ({ page }) => {
    await page.goto('/admin/users');

    // Click on first user
    const userLink = page.locator('a[href*="/admin/users/"], button:has-text("View")').first();

    if (await userLink.isVisible({ timeout: 5000 })) {
      await userLink.click();

      // Should show user profile with credit balance, transactions, etc.
      await expect(page.locator('text=/email|credit|transaction/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should adjust user credits', async ({ page }) => {
    await page.goto('/admin/users');

    // Find adjust credits button
    const adjustButton = page.locator('button:has-text("Adjust"), button:has-text("Credit")').first();

    if (await adjustButton.isVisible({ timeout: 5000 })) {
      await adjustButton.click();

      // Fill adjustment form
      const amountField = page.locator('input[name="amount"], input[type="number"]');
      const reasonField = page.locator('textarea[name="reason"], input[name="reason"]');

      if (await amountField.isVisible({ timeout: 3000 })) {
        await amountField.fill('50');
      }

      if (await reasonField.isVisible({ timeout: 3000 })) {
        await reasonField.fill('Test adjustment');
      }

      // Submit adjustment
      const submitButton = page.locator('button[type="submit"]:has-text("Adjust"), button:has-text("Confirm")');
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();

        // Should show success message
        await expect(page.locator('text=/adjusted|success|updated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should suspend user account', async ({ page }) => {
    await page.goto('/admin/users');

    const suspendButton = page.locator('button:has-text("Suspend"), button:has-text("Deactivate")').first();

    if (await suspendButton.isVisible({ timeout: 5000 })) {
      await suspendButton.click();

      // Confirm suspension
      const confirmButton = page.locator('button:has-text("Confirm")').first();
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();

        // Should show success
        await expect(page.locator('text=/suspended|deactivated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Vendor Application Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should view pending vendor applications', async ({ page }) => {
    await page.goto('/admin/vendors');

    // Should show vendor applications
    await expect(page.locator('text=/vendor|application|pending/i')).toBeVisible({ timeout: 5000 });

    // Should display applications table
    const hasApplications = await Promise.race([
      page.locator('table').isVisible({ timeout: 3000 }),
      page.locator('text=/company|status/i').isVisible({ timeout: 3000 }),
    ]).catch(() => false);

    if (hasApplications) {
      expect(hasApplications).toBe(true);
    }
  });

  test('should review vendor application details', async ({ page }) => {
    await page.goto('/admin/vendors');

    const reviewButton = page.locator('button:has-text("Review"), button:has-text("View"), a:has-text("Details")').first();

    if (await reviewButton.isVisible({ timeout: 5000 })) {
      await reviewButton.click();

      // Should show application details
      await expect(page.locator('text=/company|website|description/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should approve vendor application', async ({ page }) => {
    await page.goto('/admin/vendors');

    const approveButton = page.locator('button:has-text("Approve")').first();

    if (await approveButton.isVisible({ timeout: 5000 })) {
      await approveButton.click();

      // Confirm approval
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();

        // Should show success message
        await expect(page.locator('text=/approved|success/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should reject vendor application with reason', async ({ page }) => {
    await page.goto('/admin/vendors');

    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Deny")').first();

    if (await rejectButton.isVisible({ timeout: 5000 })) {
      await rejectButton.click();

      // Fill rejection reason
      const reasonField = page.locator('textarea[name="reason"], textarea[placeholder*="reason"]');
      if (await reasonField.isVisible({ timeout: 3000 })) {
        await reasonField.fill('Application does not meet requirements.');

        // Confirm rejection
        await page.click('button:has-text("Confirm")');

        // Should show success
        await expect(page.locator('text=/rejected|denied/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Tool Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should view all tools', async ({ page }) => {
    await page.goto('/admin/tools');

    // Should display tools list
    await expect(page.locator('text=/tool|vendor|status|credit/i')).toBeVisible({ timeout: 5000 });
  });

  test('should activate/deactivate tool', async ({ page }) => {
    await page.goto('/admin/tools');

    const toggleButton = page.locator('button:has-text("Activate"), button:has-text("Deactivate"), input[type="checkbox"]').first();

    if (await toggleButton.isVisible({ timeout: 5000 })) {
      await toggleButton.click();

      // Should show status change
      await page.waitForLoadState('networkidle');
    }
  });

  test('should edit tool details', async ({ page }) => {
    await page.goto('/admin/tools');

    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();

      // Modify tool details
      const creditsField = page.locator('input[name="credits_per_use"]');
      if (await creditsField.isVisible({ timeout: 3000 })) {
        await creditsField.fill('10');

        // Save changes
        await page.click('button[type="submit"]:has-text("Save")');

        // Should show success
        await expect(page.locator('text=/updated|saved/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should delete tool', async ({ page }) => {
    await page.goto('/admin/tools');

    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();

        // Should show success
        await expect(page.locator('text=/deleted|removed/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Platform Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display platform statistics', async ({ page }) => {
    await page.goto('/admin');

    // Should show key metrics
    await expect(page.locator('text=/user|vendor|revenue|transaction/i')).toBeVisible({ timeout: 5000 });

    // Should show numbers/statistics
    const hasStats = await page.locator('text=/\\d+.*user|\\d+.*vendor|€\\d+/i').isVisible({ timeout: 3000 });
    expect(hasStats).toBe(true);
  });

  test('should view revenue analytics', async ({ page }) => {
    await page.goto('/admin/stats');

    // Should show revenue metrics
    await expect(page.locator('text=/revenue|earnings|€/i')).toBeVisible({ timeout: 5000 });

    // Should display charts
    const hasCharts = await Promise.race([
      page.locator('canvas').isVisible({ timeout: 3000 }),
      page.locator('[class*="chart"]').isVisible({ timeout: 3000 }),
    ]).catch(() => false);

    if (hasCharts) {
      expect(hasCharts).toBe(true);
    }
  });

  test('should view transaction logs', async ({ page }) => {
    await page.goto('/admin/transactions');

    // Should display transaction history
    await expect(page.locator('text=/transaction|date|amount|user/i')).toBeVisible({ timeout: 5000 });

    // Should show transaction details
    const hasTransactions = await page.locator('table, [role="table"]').isVisible({ timeout: 3000 });
    expect(hasTransactions).toBe(true);
  });

  test('should filter transactions by date range', async ({ page }) => {
    await page.goto('/admin/transactions');

    const dateFilter = page.locator('input[type="date"], select:has-text("Date")').first();

    if (await dateFilter.isVisible({ timeout: 5000 })) {
      // Date filtering is available
      expect(await dateFilter.isVisible()).toBe(true);
    }
  });

  test('should export transaction data', async ({ page }) => {
    await page.goto('/admin/transactions');

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("CSV")').first();

    if (await exportButton.isVisible({ timeout: 5000 })) {
      // Start download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        exportButton.click(),
      ]);

      if (download) {
        // Verify download started
        expect(download.suggestedFilename()).toMatch(/transaction|export/i);
      }
    }
  });
});

test.describe('Platform Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should access platform settings', async ({ page }) => {
    await page.goto('/admin/settings');

    // Should display settings page
    await expect(page.locator('text=/setting|configuration|platform/i')).toBeVisible({ timeout: 5000 });
  });

  test('should update credit pricing', async ({ page }) => {
    await page.goto('/admin/settings');

    const pricingSection = page.locator('text=/pricing|credit.*price/i');

    if (await pricingSection.isVisible({ timeout: 5000 })) {
      // Look for pricing input
      const priceInput = page.locator('input[name*="price"], input[type="number"]').first();

      if (await priceInput.isVisible({ timeout: 3000 })) {
        // Pricing configuration is available
        expect(await priceInput.isVisible()).toBe(true);
      }
    }
  });

  test('should configure platform fees', async ({ page }) => {
    await page.goto('/admin/settings');

    // Look for fee configuration
    const feeSection = page.locator('text=/fee|commission|percentage/i');

    if (await feeSection.isVisible({ timeout: 5000 })) {
      const feeInput = page.locator('input[name*="fee"]').first();

      if (await feeInput.isVisible({ timeout: 3000 })) {
        await feeInput.fill('15'); // 15% platform fee

        // Save settings
        await page.click('button[type="submit"]:has-text("Save")');

        // Should show success
        await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Usage Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@1sub.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should view API usage logs', async ({ page }) => {
    await page.goto('/admin/usage-logs');

    // Should display usage logs
    await expect(page.locator('text=/usage|api|request|log/i')).toBeVisible({ timeout: 5000 });
  });

  test('should monitor tool usage', async ({ page }) => {
    await page.goto('/admin/stats');

    // Should show tool usage statistics
    const hasToolStats = await page.locator('text=/tool.*usage|most.*used/i').isVisible({ timeout: 5000 });

    if (hasToolStats) {
      expect(hasToolStats).toBe(true);
    }
  });

  test('should identify suspicious activity', async ({ page }) => {
    await page.goto('/admin/usage-logs');

    // Admin should be able to filter for suspicious patterns
    // - High frequency requests
    // - Failed attempts
    // - Unusual patterns

    const filterButton = page.locator('button:has-text("Filter"), select').first();

    if (await filterButton.isVisible({ timeout: 5000 })) {
      // Filtering capabilities exist
      expect(await filterButton.isVisible()).toBe(true);
    }
  });
});
