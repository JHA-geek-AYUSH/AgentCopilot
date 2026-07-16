import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The handler lives at a dot-free path (App Router can ignore leading-dot
    // folders); expose the convention-standard dotted paths via rewrites.
    return [
      {
        source: "/.well-known/ai-catalog.json",
        destination: "/api/nanda/well-known/ai-catalog.json",
      },
      {
        source: "/api/nanda/.well-known/ai-catalog.json",
        destination: "/api/nanda/well-known/ai-catalog.json",
      },
    ];
  },
};

export default nextConfig;
