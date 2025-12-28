/**
 * Vendor Tools API Integration Tests
 *
 * Tests the vendor tool management endpoints including:
 * - Tool update (PATCH /api/vendor/tools/[id]/update)
 * - Tool deletion (DELETE /api/vendor/tools/[id])
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestVendor,
  createTestUser,
  createTestTool,
  cleanupTestUser,
  getTestSupabase,
} from '../../helpers/db-helpers';

describe('Vendor Tools API', () => {
  let testVendorId: string;
  let testVendorAuth: { access_token: string };
  let testUserId: string;
  let testUserAuth: { access_token: string };
  let testToolId: string;
  let otherVendorId: string;
  let otherToolId: string;

  beforeAll(async () => {
    const supabase = getTestSupabase();

    // Create test vendor with tool
    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    // Sign in as vendor to get auth token
    const { data: vendorAuthData, error: vendorAuthError } = await supabase.auth.signInWithPassword({
      email: vendor.email!,
      password: 'TestPassword123!',
    });
    expect(vendorAuthError).toBeNull();
    testVendorAuth = vendorAuthData.session!;

    // Create test tool for vendor
    const tool = await createTestTool(testVendorId);
    testToolId = tool.id;

    // Create another vendor with tool (for unauthorized access tests)
    const otherVendor = await createTestVendor();
    otherVendorId = otherVendor.id;
    const otherTool = await createTestTool(otherVendorId);
    otherToolId = otherTool.id;

    // Create regular user (for unauthorized access tests)
    const user = await createTestUser();
    testUserId = user.id;
    const { data: userAuthData, error: userAuthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: 'TestPassword123!',
    });
    expect(userAuthError).toBeNull();
    testUserAuth = userAuthData.session!;
  });

  afterAll(async () => {
    const supabase = getTestSupabase();

    // Cleanup tools
    if (testToolId) {
      await supabase.from('tools').delete().eq('id', testToolId);
    }
    if (otherToolId) {
      await supabase.from('tools').delete().eq('id', otherToolId);
    }

    // Cleanup users
    if (testVendorId) await cleanupTestUser(testVendorId);
    if (otherVendorId) await cleanupTestUser(otherVendorId);
    if (testUserId) await cleanupTestUser(testUserId);
  });

  describe('PATCH /api/vendor/tools/[id]/update', () => {
    it('should update tool with valid vendor authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'Updated Tool Name',
          description: 'Updated short description',
          longDescription: 'Updated long description with details',
          toolExternalUrl: 'https://updated-tool.example.com',
          category: 'Productivity',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tool).toBeDefined();
      expect(data.message).toBe('Tool updated successfully');
    });

    it('should update tool metadata fields', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          emoji: '🚀',
          tags: ['productivity', 'automation', 'ai'],
          discountPercentage: 20,
          customPricingEmail: 'pricing@example.com',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should update only specific fields (partial update)', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'Partially Updated Tool',
          // Only updating name, not other fields
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should update tool images', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          logoUrl: 'https://example.com/logo.png',
          heroImageUrl: 'https://example.com/hero.jpg',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject update without authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject update by different vendor', async () => {
      const supabase = getTestSupabase();
      const otherVendorEmail = (await supabase.from('user_profiles').select('*').eq('id', otherVendorId).single()).data!.email;
      const { data: otherVendorAuthData } = await supabase.auth.signInWithPassword({
        email: otherVendorEmail!,
        password: 'TestPassword123!',
      });

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${otherVendorAuthData!.session!.access_token}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized Update Attempt',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('You do not have permission to update this tool');
    });

    it('should reject update for non-existent tool', async () => {
      const fakeToolId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${fakeToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'Update non-existent tool',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Tool not found');
    });

    it('should reject update by regular user', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'User trying to update tool',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/vendor/tools/[id]', () => {
    let testToolToDeleteId: string;

    beforeAll(async () => {
      // Create a tool to delete
      const tool = await createTestTool(testVendorId);
      testToolToDeleteId = tool.id;
    });

    it('should delete tool with valid vendor authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${testToolToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');

      // Verify tool is deleted
      const supabase = getTestSupabase();
      const { data: deletedTool } = await supabase
        .from('tools')
        .select('*')
        .eq('id', testToolToDeleteId)
        .maybeSingle();

      expect(deletedTool).toBeNull();
    });

    it('should reject deletion without authentication', async () => {
      // Create another tool to test
      const tool = await createTestTool(testVendorId);

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${tool.id}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);

      // Cleanup
      const supabase = getTestSupabase();
      await supabase.from('tools').delete().eq('id', tool.id);
    });

    it('should reject deletion by different vendor', async () => {
      // Create tool
      const tool = await createTestTool(testVendorId);

      // Try to delete with other vendor's auth
      const supabase = getTestSupabase();
      const otherVendorEmail = (await supabase.from('user_profiles').select('*').eq('id', otherVendorId).single()).data!.email;
      const { data: otherVendorAuthData } = await supabase.auth.signInWithPassword({
        email: otherVendorEmail!,
        password: 'TestPassword123!',
      });

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${tool.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${otherVendorAuthData!.session!.access_token}`,
        },
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('tools').delete().eq('id', tool.id);
    });

    it('should reject deletion for non-existent tool', async () => {
      const fakeToolId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${fakeToolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Tool not found');
    });

    it('should cascade delete related products when tool is deleted', async () => {
      // Create a tool with a product
      const tool = await createTestTool(testVendorId);

      const supabase = getTestSupabase();
      const { data: product } = await supabase
        .from('tool_products')
        .insert({
          tool_id: tool.id,
          name: 'Product to cascade delete',
          description: 'Will be deleted with tool',
          pricing_model: {},
        })
        .select()
        .single();

      // Delete the tool
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/tools/${tool.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify product was cascade deleted
      const { data: deletedProduct } = await supabase
        .from('tool_products')
        .select('*')
        .eq('id', product!.id)
        .maybeSingle();

      expect(deletedProduct).toBeNull();
    });
  });
});
