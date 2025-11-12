import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;
let errorHandlerSetup = false;

function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  
  // Clear all Supabase-related cookies
  document.cookie.split(';').forEach((cookie) => {
    const cookieName = cookie.split('=')[0].trim();
    if (
      cookieName.includes('sb-') || 
      cookieName.includes('supabase') || 
      cookieName.includes('auth-token') ||
      cookieName.includes('access-token') ||
      cookieName.includes('refresh-token')
    ) {
      // Clear with different paths and domains
      const hostname = window.location.hostname;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
    }
  });
}

export function createClient() {
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

  // Return singleton instance to avoid multiple listeners
  if (clientInstance) {
    return clientInstance;
  }

  // Create client instance
  clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);

  // Set up error handler only once
  if (!errorHandlerSetup && typeof window !== 'undefined') {
    errorHandlerSetup = true;
    
    // Set up global error handler for auth state changes
    // This catches refresh token errors that occur during automatic token refresh
    clientInstance.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing invalid session');
        clearAuthCookies();
        // Try to sign out to clear session
        clientInstance?.auth.signOut({ scope: 'local' }).catch(() => {
          // Ignore errors - we've already cleared cookies
        });
      }
    });

    // Also set up global error handler for unhandled auth errors
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        if (error && typeof error === 'object') {
          const errorMessage = error.message || error.toString();
          const errorName = error.name || '';
          
          // Handle "Auth session missing!" error - this is expected when user is not logged in
          if (
            errorMessage.includes('Auth session missing!') ||
            errorMessage.includes('Auth session missing') ||
            errorName === 'AuthSessionMissingError' ||
            errorMessage.includes('Session missing')
          ) {
            // This is a normal case when user is not logged in, silently ignore it
            event.preventDefault();
            return;
          }
          
          // Handle refresh token errors
          if (
            errorMessage.includes('Refresh Token') ||
            errorMessage.includes('refresh_token') ||
            errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('Refresh Token Not Found')
          ) {
            console.warn('Caught unhandled refresh token error, clearing session');
            clearAuthCookies();
            clientInstance?.auth.signOut({ scope: 'local' }).catch(() => {
              // Ignore errors
            });
            // Prevent the error from being logged to console
            event.preventDefault();
          }
        }
      });
    }
  }

  return clientInstance;
}

/**
 * Safely get user from Supabase, handling "Auth session missing!" errors gracefully
 * Returns { user: null, error: null } when user is not logged in (no session)
 */
export async function safeGetUser(supabase: ReturnType<typeof createClient>) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If there's an error, check if it's a "session missing" error
    if (error) {
      const errorMessage = error.message || '';
      const errorName = error.name || '';
      
      // Handle "Auth session missing!" error - this is expected when user is not logged in
      if (
        errorMessage.includes('Auth session missing!') ||
        errorMessage.includes('Auth session missing') ||
        errorName === 'AuthSessionMissingError' ||
        errorMessage.includes('Session missing')
      ) {
        // User is not logged in, which is fine - return null user with no error
        return { user: null, error: null };
      }
      
      // For other errors, return them as-is
      return { user: null, error };
    }
    
    return { user, error: null };
  } catch (err) {
    // Handle errors that might be thrown (like "Auth session missing!")
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorName = err instanceof Error ? err.name : '';
    
    // Handle "Auth session missing!" error - this is expected when user is not logged in
    if (
      errorMessage.includes('Auth session missing!') ||
      errorMessage.includes('Auth session missing') ||
      errorName === 'AuthSessionMissingError' ||
      errorMessage.includes('Session missing')
    ) {
      // User is not logged in, which is fine - return null user with no error
      return { user: null, error: null };
    }
    
    // For other errors, wrap them in an error object
    return { 
      user: null, 
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Helper function to handle auth errors, particularly refresh token errors
 * Clears the session if the error is related to invalid refresh tokens
 */
export async function handleAuthError(
  error: unknown,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  if (!error) return false;
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
    ? error 
    : String(error);
  
  const errorName = error instanceof Error ? error.name : '';
  
  // Check if it's a "session missing" error - this is expected when user is not logged in
  if (
    errorMessage.includes('Auth session missing!') ||
    errorMessage.includes('Auth session missing') ||
    errorName === 'AuthSessionMissingError' ||
    errorMessage.includes('Session missing')
  ) {
    // This is a normal case when user is not logged in, no need to handle it
    return true; // Error was handled (silently ignored)
  }
  
  // Check if it's a refresh token error
  if (
    errorMessage.includes('Refresh Token') ||
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Refresh Token Not Found')
  ) {
    try {
      // Clear invalid session
      await supabase.auth.signOut({ scope: 'local' });
      // Clear cookies manually as well
      if (typeof document !== 'undefined') {
        // Clear all Supabase-related cookies
        document.cookie.split(';').forEach((cookie) => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      return true; // Error was handled
    } catch (signOutError) {
      console.error('Error clearing session:', signOutError);
    }
  }
  return false; // Error was not handled
}

