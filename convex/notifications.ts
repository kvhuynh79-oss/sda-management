import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// User notification preferences
export const getUserPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.notificationPreferences || {
      emailEnabled: false,
      smsEnabled: false,
      criticalAlerts: true,
      warningAlerts: true,
      infoAlerts: false,
      dailyDigest: false,
      weeklyDigest: false,
    };
  },
});

// Update user notification preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    emailEnabled: v.optional(v.boolean()),
    smsEnabled: v.optional(v.boolean()),
    criticalAlerts: v.optional(v.boolean()),
    warningAlerts: v.optional(v.boolean()),
    infoAlerts: v.optional(v.boolean()),
    dailyDigest: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...preferences } = args;

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const currentPreferences = user.notificationPreferences || {
      emailEnabled: false,
      smsEnabled: false,
      criticalAlerts: true,
      warningAlerts: true,
      infoAlerts: false,
      dailyDigest: false,
      weeklyDigest: false,
    };

    const updatedPreferences: {
      emailEnabled: boolean;
      smsEnabled: boolean;
      criticalAlerts: boolean;
      warningAlerts: boolean;
      infoAlerts: boolean;
      dailyDigest: boolean;
      weeklyDigest: boolean;
    } = {
      emailEnabled: preferences.emailEnabled ?? currentPreferences.emailEnabled,
      smsEnabled: preferences.smsEnabled ?? currentPreferences.smsEnabled,
      criticalAlerts: preferences.criticalAlerts ?? currentPreferences.criticalAlerts,
      warningAlerts: preferences.warningAlerts ?? currentPreferences.warningAlerts,
      infoAlerts: preferences.infoAlerts ?? currentPreferences.infoAlerts,
      dailyDigest: preferences.dailyDigest ?? currentPreferences.dailyDigest,
      weeklyDigest: preferences.weeklyDigest ?? currentPreferences.weeklyDigest,
    };

    await ctx.db.patch(userId, {
      notificationPreferences: updatedPreferences,
    });

    return { success: true };
  },
});

// Internal mutations for getting data (called by actions)
export const getUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return {
      email: user.email,
      phone: user.phone || null,
      firstName: user.firstName,
      lastName: user.lastName,
      preferences: user.notificationPreferences || {
        emailEnabled: false,
        smsEnabled: false,
        criticalAlerts: true,
        warningAlerts: true,
        infoAlerts: false,
        dailyDigest: false,
        weeklyDigest: false,
      },
    };
  },
});

export const getAlertData = internalMutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found");
    return {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      alertType: alert.alertType,
      triggerDate: alert.triggerDate,
      dueDate: alert.dueDate || null,
    };
  },
});

// Email notification via Resend
export const sendEmailNotification = internalAction({
  args: {
    userId: v.id("users"),
    alertId: v.id("alerts")
  },
  handler: async (ctx, args): Promise<any> => {
    // Get user and alert data
    const user: any = await ctx.runMutation(internal.notifications.getUserData, {
      userId: args.userId
    });
    const alert: any = await ctx.runMutation(internal.notifications.getAlertData, {
      alertId: args.alertId
    });

    // Check if user has email notifications enabled
    if (!user.preferences.emailEnabled) {
      return { skipped: true, reason: "Email notifications disabled" };
    }

    // Check severity-based preferences
    const shouldSend =
      (alert.severity === "critical" && user.preferences.criticalAlerts) ||
      (alert.severity === "warning" && user.preferences.warningAlerts) ||
      (alert.severity === "info" && user.preferences.infoAlerts);

    if (!shouldSend) {
      return { skipped: true, reason: "Alert severity not enabled in preferences" };
    }

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email notification skipped.");
      return {
        skipped: true,
        reason: "RESEND_API_KEY not configured. Add it to environment variables."
      };
    }

    try {
      const response: any = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "alerts@yourdomain.com",
          to: user.email,
          subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: ${
                    alert.severity === "critical" ? "#dc2626" :
                    alert.severity === "warning" ? "#ea580c" :
                    "#2563eb"
                  }; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                  .badge { display: inline-block; padding: 4px 12px; background-color: ${
                    alert.severity === "critical" ? "#dc2626" :
                    alert.severity === "warning" ? "#ea580c" :
                    "#2563eb"
                  }; color: white; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                  .message { margin: 20px 0; }
                  .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">SDA Management Alert</h1>
                  </div>
                  <div class="content">
                    <div style="margin-bottom: 16px;">
                      <span class="badge">${alert.severity}</span>
                    </div>
                    <h2 style="margin-top: 0; color: #111827;">${alert.title}</h2>
                    <div class="message">
                      <p style="margin: 0;">${alert.message}</p>
                    </div>
                    ${alert.dueDate ? `
                      <div style="margin-top: 16px; padding: 12px; background-color: white; border-left: 4px solid ${
                        alert.severity === "critical" ? "#dc2626" :
                        alert.severity === "warning" ? "#ea580c" :
                        "#2563eb"
                      }; border-radius: 4px;">
                        <strong>Due Date:</strong> ${alert.dueDate}
                      </div>
                    ` : ""}
                    <div class="footer">
                      <p>This is an automated alert from your SDA Management System.</p>
                      <p>To manage your notification preferences, log in to your account.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", data);
        return { success: false, error: data };
      }

      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// SMS notification via Twilio
export const sendSMSNotification = internalAction({
  args: {
    userId: v.id("users"),
    alertId: v.id("alerts")
  },
  handler: async (ctx, args): Promise<any> => {
    // Get user and alert data
    const user: any = await ctx.runMutation(internal.notifications.getUserData, {
      userId: args.userId
    });
    const alert: any = await ctx.runMutation(internal.notifications.getAlertData, {
      alertId: args.alertId
    });

    // Check if user has SMS notifications enabled
    if (!user.preferences.smsEnabled || !user.phone) {
      return {
        skipped: true,
        reason: user.phone ? "SMS notifications disabled" : "No phone number on file"
      };
    }

    // Check severity-based preferences (SMS only for critical and warning)
    const shouldSend =
      (alert.severity === "critical" && user.preferences.criticalAlerts) ||
      (alert.severity === "warning" && user.preferences.warningAlerts);

    if (!shouldSend) {
      return { skipped: true, reason: "Alert severity not enabled for SMS" };
    }

    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio credentials not configured. SMS notification skipped.");
      return {
        skipped: true,
        reason: "Twilio credentials not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables."
      };
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      // Create basic auth token
      const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const response: any = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: user.phone,
            From: fromPhone,
            Body: `[${alert.severity.toUpperCase()}] ${alert.title}\n\n${alert.message}${alert.dueDate ? `\n\nDue: ${alert.dueDate}` : ""}\n\n- SDA Management System`,
          }).toString(),
        }
      );

      const data: any = await response.json();

      if (!response.ok) {
        console.error("Twilio API error:", data);
        return { success: false, error: data };
      }

      return { success: true, messageSid: data.sid };
    } catch (error) {
      console.error("Error sending SMS:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Get active alerts for daily digest
export const getActiveAlertsForDigest = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return alerts.map((alert) => ({
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      triggerDate: alert.triggerDate,
      dueDate: alert.dueDate || null,
    }));
  },
});

// Daily digest email
export const sendDailyDigest = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<any> => {
    const user: any = await ctx.runMutation(internal.notifications.getUserData, {
      userId: args.userId
    });

    // Check if user has daily digest enabled
    if (!user.preferences.emailEnabled || !user.preferences.dailyDigest) {
      return { skipped: true, reason: "Daily digest not enabled" };
    }

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Daily digest skipped.");
      return { skipped: true, reason: "RESEND_API_KEY not configured" };
    }

    // Get active alerts
    const alerts: any = await ctx.runMutation(
      internal.notifications.getActiveAlertsForDigest,
      { userId: args.userId }
    );

    if (alerts.length === 0) {
      return { skipped: true, reason: "No active alerts" };
    }

    // Group alerts by severity
    const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");
    const warningAlerts = alerts.filter((a: any) => a.severity === "warning");
    const infoAlerts = alerts.filter((a: any) => a.severity === "info");

    try {
      const response: any = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "alerts@yourdomain.com",
          to: user.email,
          subject: `Daily Digest: ${alerts.length} Active Alert${alerts.length !== 1 ? "s" : ""}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                  .alert-section { margin-bottom: 24px; }
                  .alert-item { background-color: white; padding: 16px; margin-bottom: 12px; border-left: 4px solid #e5e7eb; border-radius: 4px; }
                  .alert-item.critical { border-left-color: #dc2626; }
                  .alert-item.warning { border-left-color: #ea580c; }
                  .alert-item.info { border-left-color: #2563eb; }
                  .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
                  .badge.critical { background-color: #fee2e2; color: #dc2626; }
                  .badge.warning { background-color: #ffedd5; color: #ea580c; }
                  .badge.info { background-color: #dbeafe; color: #2563eb; }
                  .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
                  h2 { margin-top: 0; color: #111827; font-size: 18px; }
                  h3 { color: #374151; font-size: 16px; margin-bottom: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">Daily Alert Digest</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9;">Hi ${user.firstName}, here's your summary of active alerts</p>
                  </div>
                  <div class="content">
                    ${criticalAlerts.length > 0 ? `
                      <div class="alert-section">
                        <h3 style="color: #dc2626;">🔴 Critical Alerts (${criticalAlerts.length})</h3>
                        ${criticalAlerts.map((alert: any) => `
                          <div class="alert-item critical">
                            <div class="badge critical">CRITICAL</div>
                            <h4 style="margin: 0 0 8px 0; color: #111827;">${alert.title}</h4>
                            <p style="margin: 0; color: #6b7280;">${alert.message}</p>
                            ${alert.dueDate ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;"><strong>Due:</strong> ${alert.dueDate}</p>` : ""}
                          </div>
                        `).join("")}
                      </div>
                    ` : ""}
                    ${warningAlerts.length > 0 ? `
                      <div class="alert-section">
                        <h3 style="color: #ea580c;">⚠️ Warning Alerts (${warningAlerts.length})</h3>
                        ${warningAlerts.map((alert: any) => `
                          <div class="alert-item warning">
                            <div class="badge warning">WARNING</div>
                            <h4 style="margin: 0 0 8px 0; color: #111827;">${alert.title}</h4>
                            <p style="margin: 0; color: #6b7280;">${alert.message}</p>
                            ${alert.dueDate ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;"><strong>Due:</strong> ${alert.dueDate}</p>` : ""}
                          </div>
                        `).join("")}
                      </div>
                    ` : ""}
                    ${infoAlerts.length > 0 ? `
                      <div class="alert-section">
                        <h3 style="color: #2563eb;">ℹ️ Info Alerts (${infoAlerts.length})</h3>
                        ${infoAlerts.map((alert: any) => `
                          <div class="alert-item info">
                            <div class="badge info">INFO</div>
                            <h4 style="margin: 0 0 8px 0; color: #111827;">${alert.title}</h4>
                            <p style="margin: 0; color: #6b7280;">${alert.message}</p>
                            ${alert.dueDate ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;"><strong>Due:</strong> ${alert.dueDate}</p>` : ""}
                          </div>
                        `).join("")}
                      </div>
                    ` : ""}
                    <div class="footer">
                      <p>This is your daily digest from the SDA Management System.</p>
                      <p>To manage your notification preferences, log in to your account.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", data);
        return { success: false, error: data };
      }

      return { success: true, emailId: data.id, alertCount: alerts.length };
    } catch (error) {
      console.error("Error sending daily digest:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send notifications for recently created alerts (for cron-generated alerts)
export const sendNotificationsForRecentAlerts = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    // Get alerts created in the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const recentAlerts: any = await ctx.runQuery(api.notifications.getRecentAlerts, {
      since: oneHourAgo,
    });

    // Get all users
    const users = await ctx.runQuery(api.notifications.getAllUsers, {});

    let emailsSent = 0;
    let smsSent = 0;

    // Send notifications for each alert to each user
    for (const alert of recentAlerts) {
      for (const user of users) {
        // Send email notification
        const emailResult = await ctx.runAction(internal.notifications.sendEmailNotification, {
          userId: user._id,
          alertId: alert._id,
        });
        if (emailResult.success) emailsSent++;

        // Send SMS notification
        const smsResult = await ctx.runAction(internal.notifications.sendSMSNotification, {
          userId: user._id,
          alertId: alert._id,
        });
        if (smsResult.success) smsSent++;
      }
    }

    return {
      success: true,
      alertsProcessed: recentAlerts.length,
      emailsSent,
      smsSent,
    };
  },
});

// Internal query to get recent alerts
export const getRecentAlerts = query({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const allAlerts = await ctx.db.query("alerts").collect();
    return allAlerts.filter((alert) => alert.createdAt >= args.since);
  },
});

// Internal query to get all users
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Send daily digest to all users who have it enabled
export const sendDailyDigestForAllUsers = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    const users: any = await ctx.runQuery(api.notifications.getAllUsers, {});

    let digestsSent = 0;

    for (const user of users) {
      const result = await ctx.runAction(internal.notifications.sendDailyDigest, {
        userId: user._id,
      });

      if (result.success) digestsSent++;
    }

    return { success: true, digestsSent, totalUsers: users.length };
  },
});

/*
 * SETUP INSTRUCTIONS:
 *
 * 1. EMAIL (Resend):
 *    - Sign up at https://resend.com
 *    - Get your API key
 *    - Add to .env.local: RESEND_API_KEY=re_xxxxx
 *    - (Optional) Add custom from email: RESEND_FROM_EMAIL=alerts@yourdomain.com
 *
 * 2. SMS (Twilio):
 *    - Sign up at https://www.twilio.com
 *    - Get Account SID, Auth Token, and Phone Number
 *    - Add to .env.local:
 *      TWILIO_ACCOUNT_SID=ACxxxxx
 *      TWILIO_AUTH_TOKEN=xxxxx
 *      TWILIO_PHONE_NUMBER=+1234567890
 *
 * 3. CRON JOBS:
 *    Add to convex/crons.ts:
 *
 *    // Generate alerts daily at midnight
 *    crons.daily("generate-daily-alerts", { hourUTC: 0, minuteUTC: 0 },
 *      internal.alerts.generateAlertsInternal);
 *
 *    // Send notifications for new alerts 5 minutes after generation
 *    crons.daily("send-alert-notifications", { hourUTC: 0, minuteUTC: 5 },
 *      internal.notifications.sendNotificationsForRecentAlerts);
 *
 *    // Send daily digest at 9 AM
 *    crons.daily("send-daily-digest", { hourUTC: 9, minuteUTC: 0 },
 *      internal.notifications.sendDailyDigestForAllUsers);
 *
 * 4. AUTOMATIC NOTIFICATIONS:
 *    Email/SMS notifications are automatically sent when alerts are created via
 *    the alerts.create mutation. Cron-generated alerts require the
 *    sendNotificationsForRecentAlerts action to be scheduled.
 */

// Internal action to send test email (without requiring alertId)
export const sendTestEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY not configured"
      };
    }

    try {
      const response: any = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "alerts@yourdomain.com",
          to: args.to,
          subject: args.subject,
          html: args.html,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", data);
        return { success: false, error: JSON.stringify(data) };
      }

      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("Error sending test email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action to send test SMS (without requiring alertId)
export const sendTestSMS = internalAction({
  args: {
    to: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        error: "Twilio credentials not configured"
      };
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const response: any = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: args.to,
            From: fromPhone,
            Body: args.message,
          }).toString(),
        }
      );

      const data: any = await response.json();

      if (!response.ok) {
        console.error("Twilio API error:", data);
        return { success: false, error: JSON.stringify(data) };
      }

      return { success: true, messageSid: data.sid };
    } catch (error) {
      console.error("Error sending test SMS:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Test notification function for verifying setup
export const sendTestNotification = action({
  args: {
    userId: v.id("users"),
    testType: v.union(v.literal("email"), v.literal("sms"), v.literal("both"))
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.notifications.getUserPreferences, { userId: args.userId });
    const userDoc = await ctx.runQuery(api.auth.getUser, { userId: args.userId });

    if (!userDoc) {
      return { success: false, error: "User not found" };
    }

    const results: { email?: string; sms?: string } = {};

    // Test email notification
    if (args.testType === "email" || args.testType === "both") {
      if (!user.emailEnabled) {
        results.email = "Email notifications are disabled in your settings";
      } else {
        try {
          const emailResult = await ctx.runAction(internal.notifications.sendTestEmail, {
            to: userDoc.email,
            subject: "Test Notification - SDA Management System",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Test Notification</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px;">
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <h2 style="color: #1f2937; margin-top: 0;">✅ Email Notifications Working!</h2>
                    <p style="color: #4b5563; line-height: 1.6;">
                      Congratulations! Your email notification system is properly configured and working.
                    </p>
                    <p style="color: #4b5563; line-height: 1.6;">
                      You will now receive email alerts for:
                    </p>
                    <ul style="color: #4b5563; line-height: 1.8;">
                      <li>Critical alerts (if enabled)</li>
                      <li>Warning alerts (if enabled)</li>
                      <li>Info alerts (if enabled)</li>
                      <li>Daily digest summaries (if enabled)</li>
                    </ul>
                    <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin-top: 20px;">
                      <p style="color: #1e40af; margin: 0; font-size: 14px;">
                        <strong>Sent at:</strong> ${new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div style="background: #1f2937; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                    SDA Management System - Notification Test
                  </p>
                </div>
              </div>
            `,
          });

          if (emailResult.success) {
            results.email = "Test email sent successfully!";
          } else {
            results.email = `Failed to send email: ${emailResult.error}`;
          }
        } catch (error) {
          results.email = `Failed to send email: ${error}`;
        }
      }
    }

    // Test SMS notification
    if (args.testType === "sms" || args.testType === "both") {
      if (!user.smsEnabled) {
        results.sms = "SMS notifications are disabled in your settings";
      } else if (!userDoc.phone) {
        results.sms = "No phone number on file";
      } else {
        try {
          const smsResult = await ctx.runAction(internal.notifications.sendTestSMS, {
            to: userDoc.phone,
            message: `SDA Management Test: Your SMS notification system is working! This confirms that alerts will be sent to this number when enabled. Sent at ${new Date().toLocaleTimeString()}`,
          });

          if (smsResult.success) {
            results.sms = "Test SMS sent successfully!";
          } else {
            results.sms = `Failed to send SMS: ${smsResult.error}`;
          }
        } catch (error) {
          results.sms = `Failed to send SMS: ${error}`;
        }
      }
    }

    return { success: true, results };
  },
});
