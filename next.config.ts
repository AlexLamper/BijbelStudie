import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fixes "multiple lockfiles" workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    qualities: [50, 75, 85, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
