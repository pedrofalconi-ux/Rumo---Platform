import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@rumo/db', '@rumo/ai'],
};

export default nextConfig;
