import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/study",       destination: "/studie",       permanent: true },
      { source: "/study/:path*",destination: "/studie/:path*",permanent: true },
      { source: "/plans",       destination: "/studies",      permanent: true },
      { source: "/plans/:path*",destination: "/studies/:path*",permanent: true },
      { source: "/notes",       destination: "/notities",     permanent: true },
      { source: "/notes/:path*",destination: "/notities/:path*",permanent: true },
      { source: "/resources",   destination: "/hulpbronnen",  permanent: true },
      { source: "/profile",     destination: "/profiel",      permanent: true },
      { source: "/settings",    destination: "/instellingen", permanent: true },
      { source: "/subscribe",   destination: "/abonnement",   permanent: true },
      { source: "/success",     destination: "/succes",       permanent: true },
    ]
  },
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
