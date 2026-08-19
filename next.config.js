/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana-mobile/wallet-adapter-mobile': false,
    };
    return config;
  },
};

module.exports = nextConfig;
