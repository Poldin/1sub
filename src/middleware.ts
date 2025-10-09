import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

export async function middleware(request: NextRequest) {
  // Only protect admin routes
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  try {
    const user = await getSessionUser();
    
    if (!user) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user.role !== 'admin') {
      // Redirect to backoffice if not admin
      return NextResponse.redirect(new URL('/backoffice', request.url));
    }

    // Allow access for admin users
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*']
};
