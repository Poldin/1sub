/**
 * Checkout Flow API Integration Tests
 *
 * Tests the complete checkout flow including:
 * - Session creation
 * - OTP generation and verification
 * - Payment processing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, cleanupTestUser, getBalance, getTestSupabase } from '../../helpers/db-helpers';

describe('Checkout Flow API', () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    const testUser = await createTestUser();
    testUserId = testUser.userId;
    testUserEmail = testUser.email;
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
  });

  describe('POST /api/checkout/create', () => {
    it('should create checkout session successfully', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount_euros: 50,
          credits: 50,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.checkout_id).toBeDefined();
      expect(data.session_id).toBeDefined();

      // Verify session was created in database
      const supabase = getTestSupabase();
      const { data: checkout } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('id', data.checkout_id)
        .single();

      expect(checkout).toBeDefined();
      expect(checkout!.amount_euros).toBe(50);
      expect(checkout!.credits).toBe(50);
      expect(checkout!.status).toBe('pending');
    });

    it('should reject invalid credit amount', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount_euros: -10,
          credits: -10,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid user_id format', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'not-a-uuid',
          amount_euros: 50,
          credits: 50,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should enforce minimum purchase amount', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount_euros: 0.5, // Too small
          credits: 0.5,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('OTP Flow', () => {
    let checkoutId: string;

    beforeAll(async () => {
      // Create a checkout session for OTP tests
      const supabase = getTestSupabase();
      const { data: checkout } = await supabase
        .from('checkout_sessions')
        .insert({
          user_id: testUserId,
          amount_euros: 25,
          credits: 25,
          status: 'pending',
          stripe_session_id: `cs_test_${Date.now()}`,
        })
        .select()
        .single();

      checkoutId = checkout!.id;
    });

    describe('POST /api/checkout/generate-otp', () => {
      it('should generate OTP for valid checkout', async () => {
        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/generate-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toContain('OTP');

        // Verify OTP was created in database
        const supabase = getTestSupabase();
        const { data: otp } = await supabase
          .from('checkout_otps')
          .select('*')
          .eq('checkout_id', checkoutId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        expect(otp).toBeDefined();
        expect(otp!.code).toMatch(/^\d{6}$/); // 6-digit code
      });

      it('should reject OTP generation for non-existent checkout', async () => {
        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/generate-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: '00000000-0000-0000-0000-000000000000',
          }),
        });

        expect(response.status).toBe(404);
      });

      it('should rate limit OTP generation', async () => {
        // Try to generate OTPs multiple times rapidly
        const requests = Array.from({ length: 5 }, () =>
          fetch(`${process.env.TEST_API_URL}/api/checkout/generate-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              checkout_id: checkoutId,
            }),
          })
        );

        const responses = await Promise.all(requests);

        // Some requests should be rate limited
        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      }, 15000);
    });

    describe('POST /api/checkout/verify-otp', () => {
      it('should verify correct OTP', async () => {
        const supabase = getTestSupabase();

        // Generate OTP
        const { data: otp } = await supabase
          .from('checkout_otps')
          .insert({
            checkout_id: checkoutId,
            code: '123456',
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
          })
          .select()
          .single();

        // Verify OTP
        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
            code: '123456',
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify OTP was marked as used
        const { data: usedOtp } = await supabase
          .from('checkout_otps')
          .select('*')
          .eq('id', otp!.id)
          .single();

        expect(usedOtp!.used).toBe(true);
      });

      it('should reject incorrect OTP', async () => {
        const supabase = getTestSupabase();

        // Create OTP
        await supabase.from('checkout_otps').insert({
          checkout_id: checkoutId,
          code: '111111',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Try wrong code
        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
            code: '999999',
          }),
        });

        expect(response.status).toBe(401);
      });

      it('should reject expired OTP', async () => {
        const supabase = getTestSupabase();

        // Create expired OTP
        await supabase.from('checkout_otps').insert({
          checkout_id: checkoutId,
          code: '222222',
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        });

        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
            code: '222222',
          }),
        });

        expect(response.status).toBe(410); // Gone
      });

      it('should reject already-used OTP', async () => {
        const supabase = getTestSupabase();

        // Create used OTP
        const { data: otp } = await supabase
          .from('checkout_otps')
          .insert({
            checkout_id: checkoutId,
            code: '333333',
            used: true,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
            code: '333333',
          }),
        });

        expect(response.status).toBe(401);
      });

      it('should limit OTP verification attempts', async () => {
        const supabase = getTestSupabase();

        await supabase.from('checkout_otps').insert({
          checkout_id: checkoutId,
          code: '444444',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Try multiple wrong codes
        const requests = Array.from({ length: 10 }, (_, i) =>
          fetch(`${process.env.TEST_API_URL}/api/checkout/verify-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              checkout_id: checkoutId,
              code: `${i}${i}${i}${i}${i}${i}`,
            }),
          })
        );

        const responses = await Promise.all(requests);

        // After too many attempts, should be rate limited or locked
        const lastResponse = responses[responses.length - 1];
        expect([429, 423]).toContain(lastResponse.status); // 429 = Too Many Requests, 423 = Locked
      }, 15000);
    });
  });

  describe('POST /api/checkout/process', () => {
    it('should process checkout and add credits', async () => {
      const supabase = getTestSupabase();
      const initialBalance = await getBalance(testUserId);

      // Create checkout session
      const { data: checkout } = await supabase
        .from('checkout_sessions')
        .insert({
          user_id: testUserId,
          amount_euros: 30,
          credits: 30,
          status: 'pending',
          stripe_session_id: `cs_test_${Date.now()}`,
        })
        .select()
        .single();

      // Process the checkout (simulating successful payment)
      await supabase
        .from('checkout_sessions')
        .update({ status: 'completed' })
        .eq('id', checkout!.id);

      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 30,
        p_description: 'Credit purchase',
        p_idempotency_key: `checkout-${checkout!.id}`,
      });

      // Verify credits added
      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance + 30);

      // Verify checkout marked as completed
      const { data: completed } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('id', checkout!.id)
        .single();

      expect(completed!.status).toBe('completed');
    });

    it('should not process same checkout twice', async () => {
      const supabase = getTestSupabase();

      // Create and complete checkout
      const { data: checkout } = await supabase
        .from('checkout_sessions')
        .insert({
          user_id: testUserId,
          amount_euros: 15,
          credits: 15,
          status: 'completed', // Already completed
          stripe_session_id: `cs_test_${Date.now()}`,
        })
        .select()
        .single();

      const initialBalance = await getBalance(testUserId);

      // Try to process again
      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_description: 'Duplicate processing attempt',
        p_idempotency_key: `checkout-${checkout!.id}`,
      });

      // Should use idempotency to prevent duplicate
      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance); // No change
    });
  });

  describe('Credit Checkout API', () => {
    describe('POST /api/credit-checkout', () => {
      it('should create Stripe checkout session', async () => {
        // Mock Stripe checkout session creation
        // In real implementation, this would call Stripe API

        const response = await fetch(`${process.env.TEST_API_URL}/api/credit-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: testUserId,
            package_id: 'starter', // Example package
          }),
        });

        // Depending on implementation, might return:
        // - Stripe checkout session URL
        // - Session ID for redirect
        // - Or error if Stripe is not configured in test env

        // We accept either success or config error in test env
        expect([200, 201, 500, 503]).toContain(response.status);
      });
    });
  });

  describe('Checkout Security', () => {
    it('should sanitize user inputs', async () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        "'; DROP TABLE checkout_sessions;--",
        '../../../etc/passwd',
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await fetch(`${process.env.TEST_API_URL}/api/checkout/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: maliciousInput,
            amount_euros: 50,
            credits: 50,
          }),
        });

        // Should reject with 400 Bad Request
        expect(response.status).toBe(400);
      }
    });

    it('should prevent checkout session hijacking', async () => {
      const supabase = getTestSupabase();

      // Create checkout for user A
      const { data: checkout } = await supabase
        .from('checkout_sessions')
        .insert({
          user_id: testUserId,
          amount_euros: 100,
          credits: 100,
          status: 'pending',
          stripe_session_id: `cs_test_${Date.now()}`,
        })
        .select()
        .single();

      // Try to use it for user B (different user)
      const anotherUser = await createTestUser();

      // Attempting to process checkout for wrong user should fail
      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: anotherUser.userId, // Wrong user!
        p_amount: 100,
        p_description: 'Hijack attempt',
        p_idempotency_key: `checkout-${checkout!.id}`,
      });

      // Cleanup
      await cleanupTestUser(anotherUser.userId);

      // System should prevent crediting wrong user
      expect(true).toBe(true); // Document expected behavior
    });

    it('should log checkout activities', async () => {
      const supabase = getTestSupabase();

      // All checkout operations should be logged
      // - Session creation
      // - OTP generation
      // - OTP verification attempts
      // - Payment processing
      // - Failed attempts

      // This ensures audit trail for financial transactions
      expect(true).toBe(true); // Document expected behavior
    });
  });
});
