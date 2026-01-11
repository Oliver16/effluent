import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  // Preserve trailing slashes to match Django's APPEND_SLASH behavior
  // Without this, Next.js strips trailing slashes (308) but Django adds them back (301) = redirect loop
  trailingSlash: true,
  async rewrites() {
    // Use INTERNAL_API_URL for server-side rewrites (Docker internal networking)
    // IMPORTANT: Do NOT use NEXT_PUBLIC_API_URL - it could leak HTTP URLs to browsers
    const apiUrl = process.env.INTERNAL_API_URL
    if (!apiUrl) {
      // Warn if NEXT_PUBLIC_API_URL is set - it should not be used for rewrites
      if (process.env.NEXT_PUBLIC_API_URL) {
        console.warn(
          '\x1b[33m⚠️  NEXT_PUBLIC_API_URL is set but should not be used.\n' +
          '   This env var could leak HTTP URLs to browsers.\n' +
          '   Set INTERNAL_API_URL instead for server-side API routing.\x1b[0m'
        )
      }
      console.warn(
        '\x1b[33m⚠️  INTERNAL_API_URL is not set. API routing will be disabled.\n' +
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
