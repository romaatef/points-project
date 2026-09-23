import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "grdnzvticcfsmdxtgxgn.supabase.co",
      },
    ],
  },
};

export default nextConfig;
