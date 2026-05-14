import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/departure-reports') ||
    pathname.startsWith('/horses') ||
    pathname.startsWith('/debug-connection');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies.get('shinba-auth')?.value === '1';
  if (hasAuthCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  const nextPath = `${pathname}${search}`;
  loginUrl.searchParams.set('next', nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/reports/:path*', '/departure-reports/:path*', '/horses/:path*', '/debug-connection'],
};
