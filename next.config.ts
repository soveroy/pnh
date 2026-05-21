import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/finance-3way-match",
        destination: "/finance-3way-match/index.html",
      },
      {
        source: "/finance-3way-match/",
        destination: "/finance-3way-match/index.html",
      },
    ];
  },
};

export default nextConfig;
