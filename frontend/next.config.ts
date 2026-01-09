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
        '   Set INTERNAL_API_URL to your internal backend URL (e.g., http://backend:8000)\n' +
        '   to enable /api/* request proxying.\x1b[0m'
      )
      return []
    }
    // Use structured rewrites with 'fallback' to ensure Next.js internal
    // API routes (like /api/auth/set-cookies) are resolved FIRST.
    // Fallback rewrites only apply when no page/route exists at the path.
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
