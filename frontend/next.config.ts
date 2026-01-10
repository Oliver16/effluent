import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  // Preserve trailing slashes to match Django's APPEND_SLASH behavior
  // Without this, Next.js strips trailing slashes (308) but Django adds them back (301) = redirect loop
  trailingSlash: true,
  async rewrites() {
    // Use INTERNAL_API_URL for server-side rewrites (Docker internal networking)
    // Falls back to NEXT_PUBLIC_API_URL for backwards compatibility
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.warn(
        '\x1b[33m⚠️  Neither INTERNAL_API_URL nor NEXT_PUBLIC_API_URL is set. API routing will be disabled.\n' +
        '   Set INTERNAL_API_URL to your internal backend URL to enable /api/* request proxying.\n' +
        '   Docker: INTERNAL_API_URL=http://backend:8000 (HTTP is fine for internal Docker networking)\n' +
        '   Local:  INTERNAL_API_URL=http://localhost:8000\x1b[0m'
      )
      return []
    }
    return [
      {
        // Proxy all /api/* requests to the Django backend EXCEPT for
        // Next.js internal API routes (set-cookies, clear-cookies)
        source: '/api/:path((?!auth/set-cookies|auth/clear-cookies).*)',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
