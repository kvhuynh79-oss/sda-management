import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Generate alerts daily at midnight (00:00 UTC)
crons.daily(
  "generate-daily-alerts",
  { hourUTC: 0, minuteUTC: 0 }, // Midnight UTC
  internal.alerts.generateAlertsInternal
);

// Send notifications for newly created alerts 5 minutes after generation
crons.daily(
  "send-alert-notifications",
  { hourUTC: 0, minuteUTC: 5 },
  internal.notifications.sendNotificationsForRecentAlerts
);

// Send daily digest at 9 AM UTC
crons.daily(
  "send-daily-digest",
  { hourUTC: 9, minuteUTC: 0 },
  internal.notifications.sendDailyDigestForAllUsers
);

// ============================================
// FINANCIAL AUTOMATION CRON JOBS
// ============================================

// Generate expected payments on 1st of each month at 6 AM UTC
// This creates expected SDA, RRC, and owner disbursement records
crons.monthly(
  "generate-monthly-expected-payments",
  { day: 1, hourUTC: 6, minuteUTC: 0 },
  internal.expectedPayments.generateMonthlyExpectedInternal
);

// Check for overdue expected payments daily at 8 AM UTC
// Updates status of past-due payments and can trigger alerts
crons.daily(
  "check-overdue-payments",
  { hourUTC: 8, minuteUTC: 0 },
  internal.expectedPayments.checkOverdue
);

// Create owner payment reminders on the 2nd of each month at 9 AM UTC
// (3 days before standard owner payment date of 5th)
crons.monthly(
  "owner-payment-reminder",
  { day: 2, hourUTC: 9, minuteUTC: 0 },
  internal.alerts.createOwnerPaymentReminders
);

// Alternative: Generate alerts every 6 hours for more frequent checks
// Uncomment to enable 6-hourly alert generation instead of daily
// crons.interval(
//   "generate-alerts-every-6-hours",
//   { hours: 6 },
//   internal.alerts.generateAlertsInternal
// );
// crons.interval(
//   "send-alert-notifications-every-6-hours",
//   { hours: 6, minutes: 5 },
//   internal.notifications.sendNotificationsForRecentAlerts
// );

// ============================================
// SECURITY & COMPLIANCE CRON JOBS
// ============================================

// Update compliance certification statuses daily at 1 AM UTC
// Auto-transitions: current → expiring_soon → expired
crons.daily(
  "update-certification-statuses",
  { hourUTC: 1, minuteUTC: 0 },
  internal.complianceCertifications.updateStatuses
);

// Check for overdue complaint acknowledgments daily at 2 AM UTC
// Internal 24-hour SLA (exceeds NDIS 5 business day requirement)
crons.daily(
  "check-complaint-acknowledgments",
  { hourUTC: 2, minuteUTC: 0 },
  internal.complaints.checkOverdueAcknowledgments
);

// Check for overdue complaint resolutions daily at 2:30 AM UTC
// NDIS requires resolution within 21 business days (~30 calendar days)
crons.daily(
  "check-complaint-resolutions",
  { hourUTC: 2, minuteUTC: 30 },
  internal.complaints.checkOverdueResolutions
);

// Verify audit log hash chain integrity daily at 3 AM UTC
// This ensures immutability of audit records for NDIS 7-year retention compliance
// Any tampering with audit logs will be detected and reported
crons.daily(
  "verify-audit-log-integrity",
  { hourUTC: 3, minuteUTC: 0 },
  internal.auditLog.verifyHashChainIntegrity
);

// ============================================
// BILLING & SUBSCRIPTION CRON JOBS (B3 + B5 FIX)
// ============================================

// B4 FIX: Check and escalate grace periods for past_due subscriptions
// Days 1-7: full access, Days 8-14: read-only, Days 15+: suspended
crons.daily(
  "check-grace-periods",
  { hourUTC: 3, minuteUTC: 30 },
  internal.stripe.checkGracePeriods
);

// Clean up old Stripe webhook event records (older than 30 days)
// Prevents the idempotency table from growing indefinitely
crons.daily(
  "cleanup-stripe-webhook-events",
  { hourUTC: 4, minuteUTC: 0 },
  internal.stripe.cleanupOldWebhookEvents
);

// Check for expired trial periods and update subscription status
// Scans for orgs where trialEndsAt < now AND status is still "trialing"
crons.daily(
  "check-expired-trials",
  { hourUTC: 4, minuteUTC: 30 },
  internal.stripe.checkExpiredTrials
);

// ============================================
// CALENDAR SYNC CRON JOBS
// ============================================

// Sync Google Calendar events every 15 minutes
// Pulls new/updated/deleted events from connected Google Calendars
crons.interval(
  "sync-google-calendars",
  { minutes: 15 },
  internal.googleCalendar.syncAllGoogleConnections
);

// Sync Outlook Calendar events every 15 minutes
// Pulls new/updated/deleted events from connected Outlook/Microsoft 365 Calendars
crons.interval(
  "sync-outlook-calendars",
  { minutes: 15 },
  internal.outlookCalendar.syncAllOutlookConnections
);

// ============================================
// DATA RETENTION CRON JOBS
// ============================================

// Cleanup expired participant archives (past 7-year NDIS retention period)
// Two-phase: first marks as "expired", next cycle permanently deletes
crons.daily(
  "cleanup-expired-participant-archives",
  { hourUTC: 5, minuteUTC: 0 },
  internal.participants.cleanupExpiredArchives
);

// Check for overdue NDIS incident notifications hourly
crons.interval(
  "check-overdue-ndis-notifications",
  { hours: 1 },
  internal.incidents.checkOverdueNdisNotificationsInternal
);

export default crons;
