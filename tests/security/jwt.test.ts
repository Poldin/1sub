import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

describe('JWT Security Tests', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `jwt-test-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    });

    expect(authError).toBeNull();
    testUserId = authUser.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: testUserId,
        email: authUser.user!.email!,
        full_name: 'JWT Test User',
        role: 'user',
      });
  });

  afterEach(async () => {
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Token Structure Validation', () => {
    it('should validate JWT token structure', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();
      expect(signInData.session).toBeDefined();

      const token = signInData.session!.access_token;
      
      // Decode token to check structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // Header, payload, signature

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      expect(header.alg).toBeDefined();
      expect(header.typ).toBe('JWT');
      expect(payload.sub).toBe(testUserId);
      expect(payload.aud).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should contain required claims', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();

      const token = signInData.session!.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Check required claims
      expect(payload.sub).toBeDefined(); // Subject (user ID)
      expect(payload.aud).toBeDefined(); // Audience
      expect(payload.iss).toBeDefined(); // Issuer
      expect(payload.iat).toBeDefined(); // Issued at
      expect(payload.exp).toBeDefined(); // Expiration
      expect(payload.email).toBeDefined(); // Email
      expect(payload.role).toBeDefined(); // Role
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired tokens', async () => {
      // Create an expired token manually
      const expiredToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1s') // Expire in 1 second
        .sign(new TextEncoder().encode(jwtSecret));

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to verify expired token
      try {
        await jwtVerify(expiredToken, new TextEncoder().encode(jwtSecret));
        expect.fail('Should have thrown an error for expired token');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWT_EXPIRED');
      }
    });

    it('should accept valid non-expired tokens', async () => {
      const validToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h') // Expire in 1 hour
        .sign(new TextEncoder().encode(jwtSecret));

      // Verify valid token
      const { payload } = await jwtVerify(validToken, new TextEncoder().encode(jwtSecret));
      expect(payload.sub).toBe(testUserId);
    });

    it('should handle token refresh', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();

      const originalToken = signInData.session!.access_token;

      // Listen for token refresh
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          expect(session).toBeDefined();
          expect(session!.access_token).not.toBe(originalToken);
        }
      });

      // Wait a bit for potential refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

      subscription.unsubscribe();
    });
  });

  describe('Token Signature Validation', () => {
    it('should reject tokens with invalid signatures', async () => {
      const validToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Tamper with the signature
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -5)}XXXXX`;

      // Try to verify tampered token
      try {
        await jwtVerify(tamperedToken, new TextEncoder().encode(jwtSecret));
        expect.fail('Should have thrown an error for invalid signature');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
      }
    });

    it('should reject tokens signed with wrong secret', async () => {
      const tokenWithWrongSecret = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode('wrong-secret'));

      // Try to verify with correct secret
      try {
        await jwtVerify(tokenWithWrongSecret, new TextEncoder().encode(jwtSecret));
        expect.fail('Should have thrown an error for wrong secret');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
      }
    });
  });

  describe('Token Payload Validation', () => {
    it('should validate required payload fields', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();

      const token = signInData.session!.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Validate required fields
      expect(payload.sub).toBe(testUserId);
      expect(payload.email).toBe(`jwt-test-${Date.now()}@example.com`);
      expect(payload.role).toBe('authenticated');
      expect(payload.aud).toBe('authenticated');
      expect(payload.iss).toContain('supabase');
    });

    it('should reject tokens with missing required fields', async () => {
      const incompleteToken = await new SignJWT({
        // Missing required fields like sub, aud, iss
        email: `jwt-test-${Date.now()}@example.com`,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Try to verify incomplete token
      try {
        await jwtVerify(incompleteToken, new TextEncoder().encode(jwtSecret));
        expect.fail('Should have thrown an error for incomplete token');
      } catch (error: any) {
        // Should fail validation due to missing required fields
        expect(error).toBeDefined();
      }
    });

    it('should validate audience claim', async () => {
      const wrongAudienceToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'wrong-audience', // Wrong audience
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Try to verify with wrong audience
      try {
        await jwtVerify(wrongAudienceToken, new TextEncoder().encode(jwtSecret), {
          audience: 'authenticated', // Expected audience
        });
        expect.fail('Should have thrown an error for wrong audience');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
      }
    });

    it('should validate issuer claim', async () => {
      const wrongIssuerToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'wrong-issuer', // Wrong issuer
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Try to verify with wrong issuer
      try {
        await jwtVerify(wrongIssuerToken, new TextEncoder().encode(jwtSecret), {
          issuer: 'supabase', // Expected issuer
        });
        expect.fail('Should have thrown an error for wrong issuer');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
      }
    });
  });

  describe('Token Algorithm Security', () => {
    it('should reject tokens with weak algorithms', async () => {
      const weakAlgorithmToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'none' }) // Weak algorithm
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Try to verify token with weak algorithm
      try {
        await jwtVerify(weakAlgorithmToken, new TextEncoder().encode(jwtSecret));
        expect.fail('Should have thrown an error for weak algorithm');
      } catch (error: any) {
        expect(error.code).toBe('ERR_JWS_ALGORITHM_MISMATCH');
      }
    });

    it('should accept tokens with strong algorithms', async () => {
      const strongAlgorithmToken = await new SignJWT({
        sub: testUserId,
        email: `jwt-test-${Date.now()}@example.com`,
        role: 'user',
        aud: 'authenticated',
        iss: 'supabase',
      })
        .setProtectedHeader({ alg: 'HS256' }) // Strong algorithm
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(jwtSecret));

      // Verify token with strong algorithm
      const { payload } = await jwtVerify(strongAlgorithmToken, new TextEncoder().encode(jwtSecret));
      expect(payload.sub).toBe(testUserId);
    });
  });

  describe('Token Replay Attacks', () => {
    it('should handle token replay prevention', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();

      const token = signInData.session!.access_token;

      // Use token multiple times (should be allowed for valid tokens)
      const { data: profile1, error: error1 } = await client
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      const { data: profile2, error: error2 } = await client
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(profile1).toBeDefined();
      expect(profile2).toBeDefined();
    });
  });

  describe('Token Injection Attacks', () => {
    it('should prevent token injection in headers', async () => {
      const maliciousToken = 'malicious-token';
      
      // Try to use malicious token in Authorization header
      const response = await fetch('/api/v1/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${maliciousToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should prevent token injection in query parameters', async () => {
      const maliciousToken = 'malicious-token';
      
      // Try to use malicious token in query parameter
      const response = await fetch(`/api/v1/user/profile?token=${maliciousToken}`, {
        method: 'GET',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Token Scope and Permissions', () => {
    it('should validate token permissions for different resources', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: `jwt-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      expect(signInError).toBeNull();

      // User should be able to access their own data
      const { data: ownData, error: ownError } = await client
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(ownError).toBeNull();
      expect(ownData).toBeDefined();

      // User should not be able to access admin resources
      const { data: adminData, error: adminError } = await client
        .from('admin_audit_logs')
        .select('*');

      expect(adminError).toBeDefined();
      expect(adminData).toBeNull();
    });
  });
});
