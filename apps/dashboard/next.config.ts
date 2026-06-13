import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode for catching issues early
  reactStrictMode: true,

  // Server external packages (Prisma must run server-side only)
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'FPV',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
}

export default nextConfig
