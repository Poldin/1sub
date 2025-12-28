/**
 * Vendor Products API Integration Tests
 *
 * Tests the vendor product management endpoints including:
 * - Product creation (POST /api/vendor/products)
 * - Product update (PATCH /api/vendor/products/[id])
 * - Product deletion (DELETE /api/vendor/products/[id])
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestVendor,
  createTestUser,
  createTestTool,
  cleanupTestUser,
  getTestSupabase,
} from '../../helpers/db-helpers';

describe('Vendor Products API', () => {
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

    // Cleanup tools (products will cascade delete)
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

  describe('POST /api/vendor/products', () => {
    it('should create a product with valid vendor authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Test Product',
          description: 'A test product',
          pricing_model: {
            one_time: {
              enabled: true,
              price: 10,
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.product).toBeDefined();
      expect(data.product.name).toBe('Test Product');
      expect(data.product.tool_id).toBe(testToolId);
    });

    it('should create a product with custom pricing', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Custom Pricing Product',
          description: 'Contact us for pricing',
          pricing_model: {
            custom_plan: {
              enabled: true,
            },
          },
          is_custom_plan: true,
          contact_email: 'vendor@example.com',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.product.is_custom_plan).toBe(true);
      expect(data.product.contact_email).toBe('vendor@example.com');
    });

    it('should reject product creation without authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Unauthorized Product',
          description: 'Should fail',
          pricing_model: {},
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject product creation for tool not owned by vendor', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: otherToolId, // Different vendor's tool
          name: 'Unauthorized Product',
          description: 'Should fail',
          pricing_model: {},
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden: Tool does not belong to you');
    });

    it('should reject product creation with missing required fields', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          // Missing name
          description: 'No name provided',
          pricing_model: {},
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject product creation for non-existent tool', async () => {
      const fakeToolId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: fakeToolId,
          name: 'Product for non-existent tool',
          description: 'Should fail',
          pricing_model: {},
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Tool not found');
    });

    it('should reject product creation by regular user', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'User trying to create product',
          description: 'Should fail',
          pricing_model: {},
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/vendor/products/[id]', () => {
    let testProductId: string;

    beforeAll(async () => {
      // Create a product to update
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Product to Update',
          description: 'Original description',
          pricing_model: {
            one_time: {
              enabled: true,
              price: 20,
            },
          },
        }),
      });

      const data = await response.json();
      testProductId = data.product.id;
    });

    it('should update product with valid vendor authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'Updated Product Name',
          description: 'Updated description',
          is_active: false,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.product.name).toBe('Updated Product Name');
      expect(data.product.description).toBe('Updated description');
      expect(data.product.is_active).toBe(false);
    });

    it('should update only pricing model', async () => {
      const newPricingModel = {
        subscription: {
          enabled: true,
          price: 50,
          interval: 'monthly',
        },
      };

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          pricing_model: newPricingModel,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.product.pricing_model.subscription.price).toBe(50);
    });

    it('should reject update without authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject update by different vendor', async () => {
      const supabase = getTestSupabase();
      const { data: otherVendorAuthData } = await supabase.auth.signInWithPassword({
        email: (await supabase.from('user_profiles').select('*').eq('id', otherVendorId).single()).data!.email!,
        password: 'TestPassword123!',
      });

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${otherVendorAuthData!.session!.access_token}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden: Product does not belong to your tool');
    });

    it('should reject update for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${fakeProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          name: 'Update non-existent product',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Product not found');
    });
  });

  describe('DELETE /api/vendor/products/[id]', () => {
    let testProductToDeleteId: string;

    beforeAll(async () => {
      // Create a product to delete
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Product to Delete',
          description: 'Will be deleted',
          pricing_model: {
            one_time: {
              enabled: true,
              price: 15,
            },
          },
        }),
      });

      const data = await response.json();
      testProductToDeleteId = data.product.id;
    });

    it('should delete product with valid vendor authentication', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${testProductToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');

      // Verify product is deleted
      const supabase = getTestSupabase();
      const { data: deletedProduct } = await supabase
        .from('tool_products')
        .select('*')
        .eq('id', testProductToDeleteId)
        .maybeSingle();

      expect(deletedProduct).toBeNull();
    });

    it('should reject deletion without authentication', async () => {
      // Create another product to test
      const createResponse = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Product for auth test',
          description: 'Test',
          pricing_model: {},
        }),
      });
      const { product } = await createResponse.json();

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${product.id}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('should reject deletion by different vendor', async () => {
      // Create product
      const createResponse = await fetch(`${process.env.TEST_API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
        body: JSON.stringify({
          tool_id: testToolId,
          name: 'Product for vendor test',
          description: 'Test',
          pricing_model: {},
        }),
      });
      const { product } = await createResponse.json();

      // Try to delete with other vendor's auth
      const supabase = getTestSupabase();
      const { data: otherVendorAuthData } = await supabase.auth.signInWithPassword({
        email: (await supabase.from('user_profiles').select('*').eq('id', otherVendorId).single()).data!.email!,
        password: 'TestPassword123!',
      });

      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${otherVendorAuthData!.session!.access_token}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should reject deletion for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${process.env.TEST_API_URL}/api/vendor/products/${fakeProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testVendorAuth.access_token}`,
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Product not found');
    });
  });
});
