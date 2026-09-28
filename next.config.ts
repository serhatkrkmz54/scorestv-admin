import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.teleskor.com.tr" },
    ],
  },
  // Güvenlik başlıkları — yönetim paneli için sıkı. Başka sitenin çerçevesine
  // girmez (X-Frame-Options DENY), arama motoruna kapalı, adres dışarı
  // sızmaz. TEK kaynak burası: api-1 nginx'i (panel bloğu) bunları yazmıyor,
  // yazsaydı her başlık iki kez giderdi.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
