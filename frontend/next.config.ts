import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. Autorise ton serveur "dako" à faire du Hot-Reload
  allowedDevOrigins: ['dako', 'http://dako:3001', 'localhost'],

  // 2. Dit à Next.js qu'on est d'accord pour utiliser Turbopack (supprime l'erreur)
  turbopack: {},
};

export default nextConfig;