import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  // API routing is handled by Traefik at the infrastructure level:
  // - app.effluent.io/api/* -> backend container
  // - app.effluent.io/* (else) -> frontend container
}

export default nextConfig
