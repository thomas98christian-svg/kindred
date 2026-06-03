// ============================================================
// Next.js Middleware — Route Protection
// ============================================================
// Checks for Firebase auth session cookie on protected routes.
// Since Firebase Auth uses client-side tokens (not cookies by
// default), this middleware checks for a custom session cookie
// set by our auth flow. Protected routes redirect to /login.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/discover',
  '/connections',
  '/profile',
  '/settings',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie (set after successful Firebase auth)
  const session = request.cookies.get('__session')?.value;

  // Protect authenticated routes
  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  if (isProtectedPath && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets and API
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
