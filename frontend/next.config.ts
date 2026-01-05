import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      // Log warning at build time - NEXT_PUBLIC_API_URL is required for API routing
      // Without it, /api/* requests will 404 as they hit the Next.js app instead of the backend
      console.warn(
        '\x1b[33m⚠️  NEXT_PUBLIC_API_URL is not set. API routing will be disabled.\n' +
        '   Set NEXT_PUBLIC_API_URL to your backend URL (e.g., https://api.effluent.io)\n' +
        '   to enable /api/* request proxying.\x1b[0m'
      )
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
