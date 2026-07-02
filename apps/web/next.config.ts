import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@rumo/db", "@rumo/ai"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
