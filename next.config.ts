import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.BAKAITI_FIXTURE_PREVIEW === "1" ? ".next-preview" : ".next",
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.45"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vynsfpnkvffnkdkhmlkk.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
