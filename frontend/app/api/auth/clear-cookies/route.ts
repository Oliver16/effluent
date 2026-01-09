import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-cookies
 *
 * Clears auth cookies on logout.
 * Should be called alongside clearing localStorage.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear token cookie by setting it to empty with immediate expiry
    cookieStore.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Clear householdId cookie
    cookieStore.set('householdId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}
