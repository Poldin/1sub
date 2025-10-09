import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // For now, let the admin pages handle their own authentication
  // This avoids middleware session issues
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
