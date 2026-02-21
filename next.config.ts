import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "worker",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      // App shell - cache first for fast loading
      {
        urlPattern: /^https:\/\/.*\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // Images - cache first
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // Fonts
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // API calls to Convex - network first with fallback
      {
        urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "convex-api",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 5, // 5 minutes
          },
          networkTimeoutSeconds: 10,
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Empty turbopack config to allow webpack config from PWA plugin
  turbopack: {},
  // Security headers - hardened CSP
  async headers() {
    // Production CSP removes unsafe-eval (only needed for dev hot-reload)
    const isDev = process.env.NODE_ENV === "development";

    // Build CSP directives
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: unsafe-inline needed for Next.js hydration, unsafe-eval only in dev
      // GTM, GA4, Google Ads, and LinkedIn Insight Tag domains allowed
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://snap.licdn.com"
        : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://snap.licdn.com",
      // Styles: inline styles needed for Tailwind/Next.js
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: allow data URIs and blobs for uploads + LinkedIn pixel
      "img-src 'self' data: blob: https: https://px.ads.linkedin.com",
      // API connections to Convex, analytics, and tracking
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.ingest.sentry.io https://*.sentry.io https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://px.ads.linkedin.com",
      // Frames: GTM noscript iframe
      "frame-src 'self' https://www.googletagmanager.com",
      // Workers for PWA
      "worker-src 'self'",
      // Prevent framing (clickjacking protection)
      "frame-ancestors 'none'",
      // Restrict base URI
      "base-uri 'self'",
      // Restrict form submissions
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          // S21: Additional security headers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withPWA(nextConfig), {
  org: "mysdamanager",
  project: "sda-management",
  silent: !process.env.SENTRY_AUTH_TOKEN, // Only log when auth token present
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN, // Skip source map upload when no auth token
  },
});
