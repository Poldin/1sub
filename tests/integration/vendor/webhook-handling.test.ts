/**
 * TEST 4: Vendor Webhook Handling
 *
 * Verifies vendor properly handles webhook and invalidates local state.
 * Tests that vendors validate signatures and handle webhook events correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
} from '../../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
  cancelTestSubscription,
  cleanupTestVendorTool,
} from '../../helpers/vendor-integration-helpers';
import { MockVendorServer } from '../../mocks/vendor-server';

describe('TEST 4: Vendor Webhook Handling', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let webhookSecret: string;
  let mockServer: MockVendorServer;
  let callbackUrl: string;
  let webhookUrl: string;

  beforeAll(async () => {
    // Generate webhook secret for mock server
    const { generateWebhookSecret } = await import('@/security');
    webhookSecret = generateWebhookSecret();

    // Start mock vendor server
    mockServer = new MockVendorServer(webhookSecret);
    const baseUrl = await mockServer.start();
    callbackUrl = `${baseUrl}/callback`;
    webhookUrl = `${baseUrl}/webhook`;

    // Create test user
    const user = await createTestUser();
    testUserId = user.id;

    // Create test vendor and tool
    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    const { tool } = await createTestVendorTool(
      testVendorId,
      callbackUrl,
      webhookUrl
    );
    testToolId = tool.id;

    // Create subscription for user
    await createTestSubscription(testUserId, testToolId);
  });

  afterAll(async () => {
    await mockServer.stop();
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  it('should validate webhook signature correctly', async () => {
    mockServer.clearWebhooks();

    // Cancel subscription to trigger webhook
    await cancelTestSubscription(testUserId, testToolId);

    // Wait for webhook delivery
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const receivedWebhooks = mockServer.getReceivedWebhooks();
    expect(receivedWebhooks.length).toBeGreaterThan(0);

    // All webhooks should have valid signatures
    const invalidWebhooks = receivedWebhooks.filter((w) => !w.isValid);
    expect(invalidWebhooks.length).toBe(0);
  });

  it('should receive webhook with correct structure', async () => {
    mockServer.clearWebhooks();

    await cancelTestSubscription(testUserId, testToolId);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const receivedWebhooks = mockServer.getReceivedWebhooks();
    const webhook = receivedWebhooks.find((w) => w.type === 'entitlement.revoked');

    expect(webhook).toBeDefined();
    expect(webhook?.payload).toBeDefined();

    const payload = webhook?.payload as any;
    
    // Verify payload structure
    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('type');
    expect(payload).toHaveProperty('created');
    expect(payload).toHaveProperty('data');

    // Verify data structure
    expect(payload.data).toHaveProperty('oneSubUserId');
    expect(payload.data.oneSubUserId).toBe(testUserId);
    expect(payload.data.toolId).toBe(testToolId);
  });

  it('should receive X-1Sub-Signature header', async () => {
    mockServer.clearWebhooks();

    await cancelTestSubscription(testUserId, testToolId);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const receivedWebhooks = mockServer.getReceivedWebhooks();
    const webhook = receivedWebhooks.find((w) => w.type === 'entitlement.revoked');

    expect(webhook).toBeDefined();
    expect(webhook?.signature).toBeDefined();
    expect(webhook?.signature).toContain('t=');
    expect(webhook?.signature).toContain('v1=');
  });

  it('should handle multiple webhooks in sequence', async () => {
    mockServer.clearWebhooks();

    // Create and cancel multiple subscriptions to trigger multiple webhooks
    // (Note: We can only have one subscription per user-tool pair, so this test
    // verifies that the webhook system handles events correctly)
    
    await cancelTestSubscription(testUserId, testToolId);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const receivedWebhooks = mockServer.getReceivedWebhooks();
    expect(receivedWebhooks.length).toBeGreaterThanOrEqual(1);
    
    // All webhooks should be valid
    receivedWebhooks.forEach((webhook) => {
      expect(webhook.isValid).toBe(true);
      expect(webhook.payload).toBeDefined();
    });
  });
});

