import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xwimshzkragpcmbhxskl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    // Don't fail build on lint warnings (only errors)
    // Warnings are pre-existing in other files, not from new vendor integration code
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Don't fail build on TypeScript errors (we want to catch these)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
