import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-cookies
 *
 * Clears auth cookies on logout.
 * Should be called alongside clearing localStorage.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request is over HTTPS (directly or via proxy)
    // This matches the detection in set-cookies/route.ts for consistency
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' ||
      request.url.startsWith('https://');

    // Create response and clear cookies on it directly
    const response = NextResponse.json({ success: true });

    // Clear token cookie by setting it to empty with immediate expiry
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Clear householdId cookie
    response.cookies.set('householdId', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Clear refreshToken cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Error clearing auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}
