import type { NextConfig } from 'next';

// D1: the browser calls /api/* on the Next.js origin, so the auth cookie is first-party.
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
