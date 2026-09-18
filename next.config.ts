import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isPagesBuild = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = {
  ...(isPagesBuild ? { output: "export" as const, basePath, trailingSlash: true } : {}),
  images: {
    unoptimized: isPagesBuild,
    qualities: [70, 80, 90],
    localPatterns: [{ pathname: "/media/**" }],
  },
};

export default nextConfig;
