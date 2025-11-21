/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  swcMinify: true,
  compress: true,
  reactStrictMode: true,
  
  env: {
    NEXT_PUBLIC_APP_NAME: 'JulineMart',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'swiper'],
  },
};

module.exports = nextConfig;