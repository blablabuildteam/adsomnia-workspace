import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
