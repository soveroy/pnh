import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: "/finance-3way-match",
        destination: "/finance-3way-match/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
