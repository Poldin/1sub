import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase environment variables. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    return { supabaseResponse: NextResponse.next({ request }), user: null };
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If there's an auth error (like invalid refresh token), clear the session
    if (error) {
      const errorMessage = error.message || error.toString();
      
      // Check if it's a refresh token error
      if (
        errorMessage.includes('Refresh Token') ||
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found')
      ) {
        // Create a response to clear cookies
        const response = NextResponse.next({ request });
        
        // Extract project reference from URL for cookie pattern matching
        try {
          const url = new URL(supabaseUrl);
          const projectRef = url.hostname.split('.')[0];
          
          // Clear all possible Supabase auth cookie patterns
          const cookiePatterns = [
            `sb-${projectRef}-auth-token`,
            `sb-${projectRef}-access-token`,
            `sb-${projectRef}-refresh-token`,
            'sb-access-token',
            'sb-refresh-token',
            'supabase-auth-token',
          ];
          
          cookiePatterns.forEach((pattern) => {
            response.cookies.delete(pattern);
            // Also try with different paths
            response.cookies.set(pattern, '', { maxAge: 0, path: '/' });
          });
          
          // Clear any cookies that match Supabase patterns from request
          request.cookies.getAll().forEach((cookie) => {
            if (cookie.name.includes('sb-') || cookie.name.includes('supabase') || cookie.name.includes('auth-token')) {
              response.cookies.delete(cookie.name);
              response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
            }
          });
        } catch (urlError) {
          console.error('Error parsing Supabase URL:', urlError);
        }

        // Try to sign out (this might fail, but that's ok)
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore sign out errors - we've already cleared cookies
        }

        return { supabaseResponse: response, user: null };
      }

      // For other auth errors, log but continue
      console.error('Auth error in middleware:', errorMessage);
      return { supabaseResponse, user: null };
    }

    return { supabaseResponse, user };
  } catch (error) {
    // Handle any unexpected errors
    console.error('Unexpected error in updateSession:', error);
    return { supabaseResponse, user: null };
  }
}

