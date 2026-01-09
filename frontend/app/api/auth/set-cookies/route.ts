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
 * - householdId: The household ID (optional, can be set later)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, householdId } = body;

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
      // 7 days - should match your JWT expiration or be shorter
      maxAge: 60 * 60 * 24 * 7,
    });

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
