import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-cookies
 *
 * Sets auth cookies for SSR authentication.
 * Called after successful login to sync localStorage tokens to cookies.
 *
 * Request body:
 * - token: The access token
 * - refreshToken: The refresh token (for server-side token refresh)
 * - householdId: The household ID (optional, can be set later)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, refreshToken, householdId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    // Set token cookie
    // HttpOnly prevents JavaScript access (XSS protection)
    // Secure ensures cookies are only sent over HTTPS in production
    // SameSite=Lax provides CSRF protection while allowing top-level navigation
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 2 hours - slightly longer than JWT access token lifetime (1 hour)
      // This allows some buffer but ensures expired tokens are cleared
      maxAge: 60 * 60 * 2,
    });

    // Set refresh token cookie if provided (for server-side token refresh)
    if (refreshToken) {
      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // 7 days - matches JWT refresh token lifetime
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // Set householdId cookie if provided
    if (householdId) {
      cookieStore.set('householdId', householdId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to set cookies' },
      { status: 500 }
    );
  }
}
