import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/guide', destination: '/blog', permanent: true },
      { source: '/guide/:slug', destination: '/blog/:slug', permanent: true },
    ]
  },
};

export default nextConfig;
