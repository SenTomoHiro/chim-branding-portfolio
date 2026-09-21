import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isPagesBuild = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = {
  ...(isPagesBuild ? { output: "export" as const, basePath, trailingSlash: true } : {}),
  images: {
    unoptimized: isPagesBuild,
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    qualities: [70, 80, 90],
    localPatterns: [{ pathname: "/media/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

export default nextConfig;
