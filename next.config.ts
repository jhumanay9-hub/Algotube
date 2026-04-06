import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development mode - static export disabled
  // output: "export",
  // trailingSlash: true,

  images: {
    // Image optimization enabled for development
    // unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/Algotube/uploads/**",
      },
      {
        protocol: "http",
        hostname: "algotube.gt.tc",
        pathname: "/uploads/**",
      },
    ],
  },

  // Ignore build errors during development
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
