import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// API base URL for token refresh
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/api/auth/',
];

// Paths that should skip middleware entirely
const SKIP_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/static/',
];

/**
 * Check if a path is public (doesn't require auth)
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Check if a path should skip middleware
 */
function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Attempt to refresh the access token using the refresh token.
 */
async function refreshToken(refreshToken: string): Promise<{ access: string; refresh?: string } | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access ? data : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files and Next.js internals
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const token = request.cookies.get('token')?.value;
  const refreshTokenValue = request.cookies.get('refreshToken')?.value;

  // If no token and no refresh token, redirect to login
  if (!token && !refreshTokenValue) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If we have a token, allow the request
  // The token may be expired, but we'll try to refresh proactively if we also have a refresh token
  if (token) {
    // Check if token looks expired by attempting a lightweight validation
    // For now, just allow the request - the server-side fetch will handle 401s
    return NextResponse.next();
  }

  // No access token but we have a refresh token - try to refresh
  if (refreshTokenValue) {
    const newTokens = await refreshToken(refreshTokenValue);

    if (newTokens) {
      // Create response and set updated cookies
      const response = NextResponse.next();

      // Set new access token cookie
      response.cookies.set('token', newTokens.access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours
      });

      // Update refresh token if a new one was provided
      if (newTokens.refresh) {
        response.cookies.set('refreshToken', newTokens.refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }

      return response;
    }

    // Refresh failed - clear cookies and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'session_expired');

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    response.cookies.delete('refreshToken');

    return response;
  }

  // Fallback: redirect to login
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
