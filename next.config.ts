import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@xenova/transformers', '@lancedb/lancedb', 'better-sqlite3'],
};

export default nextConfig;
