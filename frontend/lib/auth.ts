/**
 * Client-side auth utilities
 *
 * Manages auth state in both localStorage (for client-side) and cookies (for SSR).
 */

/**
 * Set auth cookies after successful login.
 * Call this after storing tokens in localStorage.
 *
 * @param token - The access token
 * @param householdId - Optional household ID
 * @param refreshToken - Optional refresh token (for server-side token refresh)
 */
export async function setAuthCookies(token: string, householdId?: string, refreshToken?: string): Promise<boolean> {
  try {
    // If no refreshToken provided, try to get it from localStorage
    const refresh = refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null);

    const response = await fetch('/api/auth/set-cookies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, refreshToken: refresh, householdId }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to set auth cookies:', error);
    return false;
  }
}

/**
 * Update the householdId cookie.
 * Call this when the household changes or is first set.
 */
export async function updateHouseholdCookie(householdId: string): Promise<boolean> {
  const token = localStorage.getItem('token');
  if (!token) return false;

  return setAuthCookies(token, householdId);
}

/**
 * Clear all auth data (localStorage and cookies).
 * Call this on logout.
 */
export async function logout(): Promise<void> {
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('householdId');

  // Clear cookies
  try {
    await fetch('/api/auth/clear-cookies', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to clear auth cookies:', error);
  }
}

/**
 * Sync current localStorage auth to cookies.
 * Useful for ensuring cookies are in sync with localStorage.
 */
export async function syncAuthCookies(): Promise<boolean> {
  const token = localStorage.getItem('token');
  const householdId = localStorage.getItem('householdId');

  if (!token) return false;

  return setAuthCookies(token, householdId || undefined);
}
