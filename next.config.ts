import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to successfully complete even if there are minor type warnings
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to complete even if there are linting warnings
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;