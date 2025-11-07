import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow API routes to handle their own auth to avoid redirecting POSTs like OTP verification
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/waitlist'];

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

