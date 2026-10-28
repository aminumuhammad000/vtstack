import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': path.resolve(__dirname, 'src/lib/router-compat.tsx'),
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/app',
        permanent: true,
      },
      {
        source: '/dashboard/:path*',
        destination: '/app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
