import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gitforge/ui"],
  async rewrites() {
    return [
      {
        source: "/api/v1/repos/:path*",
        destination: "http://localhost:3002/api/v1/repos/:path*",
      },
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3001/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
