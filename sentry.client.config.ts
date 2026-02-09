import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0, // Don't record session replays
  replaysOnErrorSampleRate: 0.1, // Record 10% of error sessions
});
