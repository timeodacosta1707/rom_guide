import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['dako', 'dako:3000', 'localhost'],
  turbopack: {},
};

export default nextConfig;