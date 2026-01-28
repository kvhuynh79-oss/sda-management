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

export default crons;
