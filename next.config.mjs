import logoHosts from './src/lib/jobs/logoHosts.json' with { type: 'json' };

const isDev = process.env.NODE_ENV !== 'production';

// Company logos on /jobs are only loaded from these hosts (and their
// subdomains). The jobs API drops logo URLs from any other host, so this list
// is the single source of truth for both. See docs/remediation/GLOBALCV_SECURITY_FIXES.md.
const logoSources = logoHosts.flatMap((host) => [`https://${host}`, `https://*.${host}`]);

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js App Router's inline bootstrap
  // scripts on statically rendered pages (a nonce would force every page to
  // render dynamically). 'unsafe-eval' is only needed by the dev server.
  // 'wasm-unsafe-eval' allows WebAssembly compilation only (used by the PDF
  // layout engine), not JavaScript eval.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // data: lets the PDF layout engine load its embedded WebAssembly via fetch();
  // it involves no network request.
  "connect-src 'self' data:",
  `img-src 'self' data: blob: ${logoSources.join(' ')}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  // Prevent the page from being embedded in iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't send the full URL as referrer to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable access to camera/mic/geolocation unless needed
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Force HTTPS for 1 year once deployed
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
