import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@supabase/supabase-js",
      "lucide-react",
    ],
  },
  async headers() {
    return [
      {
        // Required for SharedArrayBuffer used by FFmpeg WASM
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
        ],
      },
      {
        // Allow same-origin pages to load static assets (images, videos, audio)
        // under COEP require-corp — without this header the browser blocks them
        source: "/bootcamp-reel/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
