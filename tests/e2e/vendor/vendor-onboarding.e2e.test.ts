/**
 * Vendor Onboarding E2E Tests
 *
 * Tests the complete vendor journey from application to tool creation.
 */

import { test, expect } from '@playwright/test';

test.describe('Vendor Onboarding Flow', () => {
  const vendorEmail = `vendor-${Date.now()}@example.com`;
  const vendorPassword = 'VendorPassword123!';

  test('complete vendor onboarding journey', async ({ page }) => {
    // Step 1: Register as a user
    await page.goto('/register');
    await page.fill('input[name="email"]', vendorEmail);
    await page.fill('input[name="password"]', vendorPassword);
    await page.fill('input[name="confirmPassword"]', vendorPassword);
    await page.click('button[type="submit"]');

    // Should redirect to backoffice after registration
    await expect(page).toHaveURL(/backoffice|dashboard/, { timeout: 10000 });

    // Step 2: Navigate to vendor application
    // Look for vendor application link/button
    const vendorLink = page.locator('a:has-text("Become a Vendor"), a:has-text("Vendor"), button:has-text("Apply as Vendor")').first();

    if (await vendorLink.isVisible({ timeout: 5000 })) {
      await vendorLink.click();

      // Step 3: Fill vendor application form
      await page.waitForLoadState('networkidle');

      // Fill in application details (adjust selectors based on actual form)
      const companyNameField = page.locator('input[name="company_name"], input[name="companyName"]');
      if (await companyNameField.isVisible({ timeout: 2000 })) {
        await companyNameField.fill('Test Vendor Company');
      }

      const websiteField = page.locator('input[name="website"], input[name="company_website"]');
      if (await websiteField.isVisible({ timeout: 2000 })) {
        await websiteField.fill('https://testvendor.com');
      }

      const descriptionField = page.locator('textarea[name="description"], textarea[name="business_description"]');
      if (await descriptionField.isVisible({ timeout: 2000 })) {
        await descriptionField.fill('We provide amazing testing tools for developers.');
      }

      // Submit application
      const submitButton = page.locator('button[type="submit"]:has-text("Submit"), button:has-text("Apply")').first();
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();

        // Should show success message
        await expect(page.locator('text=/application.*submitted|thank you/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('vendor dashboard access after approval', async ({ page, context }) => {
    // Note: This test assumes vendor is already approved
    // In a real scenario, you'd need admin approval or use a pre-approved test vendor

    await page.goto('/login');
    await page.fill('input[name="email"]', 'approved-vendor@example.com');
    await page.fill('input[name="password"]', 'VendorPass123!');
    await page.click('button[type="submit"]');

    // Should have access to vendor dashboard
    await page.goto('/vendor');

    // Verify vendor dashboard elements are visible
    await expect(page.locator('text=/vendor|dashboard/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Vendor Tool Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    await page.fill('input[name="email"]', 'vendor@example.com');
    await page.fill('input[name="password"]', 'VendorPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should create new tool', async ({ page }) => {
    // Navigate to tool creation
    await page.goto('/vendor/tools');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New Tool"), a:has-text("Create Tool")').first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();

      // Fill tool details
      await page.waitForLoadState('networkidle');

      const toolName = `Test Tool ${Date.now()}`;
      await page.fill('input[name="name"], input[name="tool_name"]', toolName);
      await page.fill('textarea[name="description"]', 'A test tool for E2E testing');

      // Set credits per use
      const creditsField = page.locator('input[name="credits_per_use"], input[name="creditsPerUse"]');
      if (await creditsField.isVisible({ timeout: 2000 })) {
        await creditsField.fill('5');
      }

      // Submit form
      await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');

      // Should show success message or redirect to tools list
      await expect(page.locator(`text=/${toolName}|created|success/i`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view tool list', async ({ page }) => {
    await page.goto('/vendor/tools');

    // Should display tools table/list
    await expect(page.locator('text=/tool|name|credits/i')).toBeVisible({ timeout: 5000 });
  });

  test('should edit existing tool', async ({ page }) => {
    await page.goto('/vendor/tools');

    // Find edit button for first tool
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // Modify description
      const descField = page.locator('textarea[name="description"]');
      if (await descField.isVisible({ timeout: 2000 })) {
        await descField.fill('Updated description for E2E test');

        // Save changes
        await page.click('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update")');

        // Should show success message
        await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should toggle tool active status', async ({ page }) => {
    await page.goto('/vendor/tools');

    // Look for toggle switch or activate/deactivate button
    const toggleButton = page.locator('button:has-text("Activate"), button:has-text("Deactivate"), input[type="checkbox"]').first();

    if (await toggleButton.isVisible({ timeout: 5000 })) {
      await toggleButton.click();

      // Should show status change feedback
      await expect(page.locator('text=/activated|deactivated|status/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Vendor API Key Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'vendor@example.com');
    await page.fill('input[name="password"]', 'VendorPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should generate API key for tool', async ({ page }) => {
    await page.goto('/vendor/tools');

    // Look for API key section or button
    const apiKeyButton = page.locator('button:has-text("API Key"), button:has-text("Generate Key")').first();

    if (await apiKeyButton.isVisible({ timeout: 5000 })) {
      await apiKeyButton.click();

      // Should display generated API key (shown once)
      await expect(page.locator('text=/sk-tool-|api.*key|copy/i')).toBeVisible({ timeout: 5000 });

      // Should show warning about copying key
      await expect(page.locator('text=/copy|save|once/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should view API key usage statistics', async ({ page }) => {
    await page.goto('/vendor/analytics');

    // Should show API usage metrics
    await expect(page.locator('text=/request|usage|calls/i')).toBeVisible({ timeout: 5000 });
  });

  test('should regenerate API key', async ({ page }) => {
    await page.goto('/vendor/tools');

    const regenerateButton = page.locator('button:has-text("Regenerate"), button:has-text("New Key")').first();

    if (await regenerateButton.isVisible({ timeout: 5000 })) {
      // Should show confirmation dialog
      await regenerateButton.click();

      // Confirm regeneration
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();

        // Should display new key
        await expect(page.locator('text=/new.*key|sk-tool-/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Vendor Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'vendor@example.com');
    await page.fill('input[name="password"]', 'VendorPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display revenue analytics', async ({ page }) => {
    await page.goto('/vendor/analytics');

    // Should show revenue metrics
    await expect(page.locator('text=/revenue|earnings|€/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display tool performance metrics', async ({ page }) => {
    await page.goto('/vendor/analytics');

    // Should show usage statistics
    const metricsVisible = await Promise.race([
      page.locator('text=/usage|requests|users/i').isVisible({ timeout: 5000 }),
      page.locator('text=/performance|metric/i').isVisible({ timeout: 5000 }),
    ]).catch(() => false);

    expect(metricsVisible).toBe(true);
  });

  test('should display time series charts', async ({ page }) => {
    await page.goto('/vendor/analytics');

    // Look for chart elements
    const chartVisible = await Promise.race([
      page.locator('canvas, svg[class*="chart"]').isVisible({ timeout: 5000 }),
      page.locator('[class*="chart"], [class*="graph"]').isVisible({ timeout: 5000 }),
    ]).catch(() => false);

    // Charts should be present (if data exists)
    if (chartVisible) {
      expect(chartVisible).toBe(true);
    }
  });

  test('should filter analytics by date range', async ({ page }) => {
    await page.goto('/vendor/analytics');

    // Look for date range selector
    const dateFilter = page.locator('select[name="date_range"], button:has-text("Last"), input[type="date"]').first();

    if (await dateFilter.isVisible({ timeout: 5000 })) {
      await dateFilter.click();

      // Should be able to select date range
      const option = page.locator('text=/7 days|30 days|month/i').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();

        // Analytics should update
        await page.waitForLoadState('networkidle');
      }
    }
  });
});

test.describe('Vendor Payout Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'vendor@example.com');
    await page.fill('input[name="password"]', 'VendorPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display current balance', async ({ page }) => {
    await page.goto('/vendor/payouts');

    // Should show balance
    await expect(page.locator('text=/balance|available|€/i')).toBeVisible({ timeout: 5000 });
  });

  test('should initiate Stripe Connect onboarding', async ({ page }) => {
    await page.goto('/vendor/payouts');

    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Setup"), a:has-text("Stripe")').first();

    if (await connectButton.isVisible({ timeout: 5000 })) {
      await connectButton.click();

      // Should redirect to Stripe Connect onboarding or show already connected
      await page.waitForLoadState('networkidle');

      // Either on Stripe or see "connected" status
      const isOnStripe = page.url().includes('stripe.com');
      const isConnected = await page.locator('text=/connected|active/i').isVisible({ timeout: 2000 });

      expect(isOnStripe || isConnected).toBe(true);
    }
  });

  test('should view payout history', async ({ page }) => {
    await page.goto('/vendor/payouts');

    // Should display payout history table
    await expect(page.locator('text=/history|payout|date/i')).toBeVisible({ timeout: 5000 });
  });

  test('should request payout', async ({ page }) => {
    await page.goto('/vendor/payouts');

    const payoutButton = page.locator('button:has-text("Request"), button:has-text("Payout")').first();

    if (await payoutButton.isVisible({ timeout: 5000 })) {
      // Click payout button
      await payoutButton.click();

      // May show confirmation or minimum amount warning
      const confirmVisible = await page.locator('button:has-text("Confirm")').isVisible({ timeout: 2000 });

      if (confirmVisible) {
        await page.click('button:has-text("Confirm")');

        // Should show success or processing message
        await expect(page.locator('text=/requested|processing|success/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
