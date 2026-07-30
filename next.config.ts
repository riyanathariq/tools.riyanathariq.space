import type { NextConfig } from "next";

const apiProxy = process.env.TOOLS_API_PROXY || "http://127.0.0.1:3003";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${apiProxy}/auth/:path*` },
      { source: "/api/cloud/:path*", destination: `${apiProxy}/api/cloud/:path*` },
      { source: "/hook/:path*", destination: `${apiProxy}/hook/:path*` },
      { source: "/healthz", destination: `${apiProxy}/healthz` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
