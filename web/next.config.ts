import type { NextConfig } from 'next'
import path from 'node:path'

const apiPort = process.env.API_PORT ?? '3001'
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${apiPort}`

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
      { source: '/health', destination: `${apiBase}/health` },
    ]
  },
}

export default nextConfig
