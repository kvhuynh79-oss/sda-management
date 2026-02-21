import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay — captures DOM snapshots for debugging
  replaysSessionSampleRate: 0.1, // Record 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // Record 100% of sessions with errors

  integrations: [
    Sentry.replayIntegration({
      // Privacy: mask all text and inputs to protect PII/NDIS data
      maskAllText: true,
      maskAllInputs: true,
      // Block media elements that could contain sensitive content
      blockAllMedia: false,
      // Network request/response bodies are NOT captured by default
      networkDetailAllowUrls: [],
      networkDetailDenyUrls: [/.*/],
    }),
  ],
});
