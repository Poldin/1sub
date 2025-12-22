/**
 * Centralized Supabase Client Factory
 *
 * CANONICAL SOURCE: All Supabase client creation MUST go through this file.
 * DO NOT create Supabase clients elsewhere in the codebase.
 *
 * Exports:
 * - createBrowserClient() - For client-side (browser) code
 * - createServerClient() - For server-side code with user authentication
 * - createServiceClient() - For server-side code needing elevated (service role) permissions
 * - safeGetUser() - Safe user retrieval handling auth errors gracefully
 * - handleAuthError() - Auth error handler
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function getSupabaseEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase environment variables.\n\n` +
      `Please create a .env.local file in the root directory with:\n\n` +
      `NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
      `You can find these values in your Supabase project settings:\n` +
      `https://supabase.com/dashboard/project/_/settings/api`
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getServiceRoleKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role environment variables are not configured');
  }

  return { supabaseUrl, serviceRoleKey };
}

// ============================================================================
// BROWSER CLIENT (Client-Side)
// ============================================================================

let browserClientInstance: ReturnType<typeof createSupabaseBrowserClient> | null = null;
let errorHandlerSetup = false;

function clearAuthCookies() {
  if (typeof document === 'undefined') return;

  document.cookie.split(';').forEach((cookie) => {
    const cookieName = cookie.split('=')[0].trim();
    if (
      cookieName.includes('sb-') ||
      cookieName.includes('supabase') ||
      cookieName.includes('auth-token') ||
      cookieName.includes('access-token') ||
      cookieName.includes('refresh-token')
    ) {
      const hostname = window.location.hostname;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
    }
  });
}

/**
 * Create a browser-side Supabase client.
 * Uses singleton pattern to avoid multiple auth listeners.
 *
 * Use this in:
 * - React components
 * - Client-side hooks
 * - Browser-executed code
 */
export function createBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvVars();

  // Return singleton instance to avoid multiple listeners
  if (browserClientInstance) {
    return browserClientInstance;
  }

  browserClientInstance = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);

  // Set up error handler only once
  if (!errorHandlerSetup && typeof window !== 'undefined') {
    errorHandlerSetup = true;

    browserClientInstance.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing invalid session');
        clearAuthCookies();
        browserClientInstance?.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (error && typeof error === 'object') {
        const errorMessage = error.message || error.toString();
        const errorName = error.name || '';

        // Handle "Auth session missing!" error
        if (
          errorMessage.includes('Auth session missing!') ||
          errorMessage.includes('Auth session missing') ||
          errorName === 'AuthSessionMissingError' ||
          errorMessage.includes('Session missing')
        ) {
          event.preventDefault();
          return;
        }

        // Handle refresh token errors
        if (
          errorMessage.includes('Refresh Token') ||
          errorMessage.includes('refresh_token') ||
          errorMessage.includes('Invalid Refresh Token') ||
          errorMessage.includes('Refresh Token Not Found') ||
          (errorName === 'AuthApiError' && errorMessage.includes('refresh'))
        ) {
          clearAuthCookies();
          browserClientInstance?.auth.signOut({ scope: 'local' }).catch(() => {});
          event.preventDefault();
        }
      }
    }, true);
  }

  return browserClientInstance;
}

// ============================================================================
// SERVER CLIENT (Server-Side with User Auth)
// ============================================================================

/**
 * Create a server-side Supabase client with user authentication.
 * Uses cookies for session management.
 *
 * Use this in:
 * - API routes that need authenticated user context
 * - Server components
 * - Server actions
 */
export async function createServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvVars();
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

// ============================================================================
// SERVICE CLIENT (Server-Side with Elevated Permissions)
// ============================================================================

/**
 * Create a server-side Supabase client with service role (admin) permissions.
 * Bypasses RLS policies.
 *
 * SECURITY WARNING: Only use when absolutely necessary:
 * - API key verification
 * - Admin operations
 * - System-level database operations
 * - RPC functions that require service_role
 *
 * DO NOT use for regular user operations.
 */
export function createServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleKey();
  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely get user from Supabase, handling auth errors gracefully.
 * Returns { user: null, error: null } when user is not logged in.
 */
export async function safeGetUser(supabase: ReturnType<typeof createBrowserClient>) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      const errorMessage = error.message || '';
      const errorName = error.name || '';

      // Handle session missing error
      if (
        errorMessage.includes('Auth session missing!') ||
        errorMessage.includes('Auth session missing') ||
        errorName === 'AuthSessionMissingError' ||
        errorMessage.includes('Session missing')
      ) {
        return { user: null, error: null };
      }

      // Handle refresh token errors
      if (
        errorMessage.includes('Refresh Token') ||
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found')
      ) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Ignore sign out errors
        }
        clearAuthCookies();
        return { user: null, error: null };
      }

      return { user: null, error };
    }

    return { user, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorName = err instanceof Error ? err.name : '';

    if (
      errorMessage.includes('Auth session missing!') ||
      errorMessage.includes('Auth session missing') ||
      errorName === 'AuthSessionMissingError' ||
      errorMessage.includes('Session missing')
    ) {
      return { user: null, error: null };
    }

    if (
      errorMessage.includes('Refresh Token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('Refresh Token Not Found')
    ) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore sign out errors
      }
      clearAuthCookies();
      return { user: null, error: null };
    }

    return {
      user: null,
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Handle auth errors, particularly refresh token errors.
 * Clears the session if the error is related to invalid refresh tokens.
 * Returns true if error was handled.
 */
export async function handleAuthError(
  error: unknown,
  supabase: ReturnType<typeof createBrowserClient>
): Promise<boolean> {
  if (!error) return false;

  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
    ? error
    : String(error);

  const errorName = error instanceof Error ? error.name : '';

  // Check if it's a session missing error
  if (
    errorMessage.includes('Auth session missing!') ||
    errorMessage.includes('Auth session missing') ||
    errorName === 'AuthSessionMissingError' ||
    errorMessage.includes('Session missing')
  ) {
    return true;
  }

  // Check if it's a refresh token error
  if (
    errorMessage.includes('Refresh Token') ||
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Refresh Token Not Found')
  ) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((cookie) => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      return true;
    } catch (signOutError) {
      console.error('Error clearing session:', signOutError);
    }
  }
  return false;
}

// ============================================================================
// LEGACY ALIASES (for backward compatibility during migration)
// These will be removed after all imports are updated.
// ============================================================================

/** @deprecated Use createBrowserClient() instead */
export const createClient = createBrowserClient;
