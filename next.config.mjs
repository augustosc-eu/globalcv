/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent the page from being embedded in iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't send the full URL as referrer to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable access to camera/mic/geolocation unless needed
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year once deployed
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Content Security Policy — allow Google Fonts CDN (used for JP PDF font)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",  // data: for base64 photos, blob: for PDF preview
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      // @react-pdf/renderer references these Node-only modules — stub them out in browser builds
      canvas: './src/lib/empty-module.js',
      encoding: './src/lib/empty-module.js',
    },
  },
  // Keep webpack config for fallback / CI environments that opt into webpack
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
