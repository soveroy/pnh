import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['exceljs'],
  serverActions: {
    bodySizeLimit: '15mb',
  },
};

export default nextConfig;
