import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/initiatives/:id",
        destination: "/workstreams/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
