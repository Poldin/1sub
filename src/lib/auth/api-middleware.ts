/**
 * API Authentication Middleware
 *
 * Provides authentication helpers for API routes.
 * Distinguishes between public and protected API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import type { User } from '@supabase/supabase-js';

/**
 * Public API endpoints that don't require authentication
 * These are typically webhooks or public verification endpoints
 */
export const PUBLIC_API_ROUTES = [
  '/api/stripe/webhook',
  '/api/v1/verify-user',
  '/api/v1/credits/consume', // Uses API key authentication
  '/api/cron/process-subscriptions', // Uses cron secret authentication
  '/api/auth/verify-otp',
  '/api/public', // Public endpoints (e.g., /api/public/tools for home page)
];

/**
 * Check if a path is a public API route
 */
export function isPublicApiRoute(path: string): boolean {
  return PUBLIC_API_ROUTES.some(route => path.startsWith(route));
}

/**
 * Verify API route authentication
 * Returns user if authenticated, null otherwise
 */
export async function verifyApiAuth(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return null;
  }
}

/**
 * Middleware wrapper for protected API routes
 * Returns 401 if not authenticated
 */
export async function withApiAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await verifyApiAuth(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  return handler(request, user);
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.role === 'admin';
  } catch (error) {
    console.error('[API Auth] Error checking admin status:', error);
    return false;
  }
}

/**
 * Middleware wrapper for admin-only API routes
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await verifyApiAuth(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  const userIsAdmin = await isAdmin(user.id);
  
  if (!userIsAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    );
  }

  return handler(request, user);
}

