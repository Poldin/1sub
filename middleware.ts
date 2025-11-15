import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';
import { isPublicApiRoute, verifyApiAuth } from '@/lib/auth/api-middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle API routes with authentication
  if (path.startsWith('/api/')) {
    // Public API routes don't need authentication
    if (isPublicApiRoute(path)) {
      return NextResponse.next();
    }

    // Protected API routes require authentication
    const user = await verifyApiAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/waitlist', '/forgot-password'];

  // Check if the current path is public
  const isPublicPath = publicPaths.includes(path);

  // If user is not logged in and trying to access a protected route
  if (!user && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and trying to access login/register, redirect to backoffice
  if (user && (path === '/login' || path === '/register')) {
    const redirectUrl = new URL('/backoffice', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

