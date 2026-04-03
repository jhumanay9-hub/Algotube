import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // ADD THIS LINE: It creates physical folders for your routes
  trailingSlash: true,

  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
