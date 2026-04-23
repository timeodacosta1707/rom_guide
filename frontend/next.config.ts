import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['dako', 'http://dako:3001', 'localhost'],
  turbopack: {},
};

export default nextConfig;