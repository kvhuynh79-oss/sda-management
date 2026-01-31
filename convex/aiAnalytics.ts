import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { callClaudeAPI, daysUntil } from "./aiUtils";

// Type definitions
interface PaymentAnomaly {
  participantId: string;
  participantName: string;
  anomalyType: "variance" | "missing" | "late" | "duplicate" | "amount_change";
  severity: "low" | "medium" | "high";
  description: string;
  affectedPayments: string[];
  suggestedAction: string;
}

interface ReportSummary {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  riskAreas: string[];
}

// ==================== Payment Anomaly Detection ====================

export const detectPaymentAnomalies = action({
  args: {},
  handler: async (ctx): Promise<PaymentAnomaly[]> => {
    // Fetch all payments and participants
    const payments = await ctx.runQuery(
      // @ts-expect-error - internal query
      "payments:getAll"
    );
    const participants = await ctx.runQuery(
      // @ts-expect-error - internal query
      "participants:getAll"
    );

    // Prepare data for Claude analysis
    const paymentData = payments.map((p: Record<string, unknown>) => ({
      id: p._id,
      participantId: p.participantId,
      participantName: p.participant
        ? `${(p.participant as Record<string, unknown>).firstName} ${(p.participant as Record<string, unknown>).lastName}`
        : "Unknown",
      paymentDate: p.paymentDate,
      periodStart: p.paymentPeriodStart,
      periodEnd: p.paymentPeriodEnd,
      expected: p.expectedAmount,
      actual: p.actualAmount,
      variance: p.variance,
      source: p.paymentSource,
    }));

    const systemPrompt = `You are a financial analyst specializing in NDIS SDA (Specialist Disability Accommodation) payments in Australia.

Analyze the payment data and identify anomalies. Look for:

1. **Variance Anomalies**: Payments where actual differs significantly from expected (>5% variance)
2. **Missing Payments**: Expected monthly payments that appear to be missing for participants
3. **Late Payments**: Patterns suggesting delayed payments
4. **Duplicate Payments**: Same period covered by multiple payments
5. **Amount Changes**: Sudden changes in payment amounts without clear reason

For each anomaly found, provide:
- anomalyType: "variance" | "missing" | "late" | "duplicate" | "amount_change"
- severity: "low" (informational) | "medium" (needs review) | "high" (requires immediate action)
- description: Clear explanation of the anomaly
- suggestedAction: What should be done

Respond with a JSON array:
[
  {
    "participantId": "id",
    "participantName": "Name",
    "anomalyType": "type",
    "severity": "level",
    "description": "description",
    "affectedPayments": ["payment_id1", "payment_id2"],
    "suggestedAction": "action"
  }
]

If no anomalies are found, return an empty array: []`;

    const userPrompt = `Analyze these SDA payment records for anomalies:

${JSON.stringify(paymentData, null, 2)}

Active participants: ${participants.length}
Total payments: ${payments.length}

Find and report any payment anomalies.`;

    try {
      const response = await callClaudeAPI(systemPrompt, [
        { role: "user", content: userPrompt },
      ], 4096);

      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]) as PaymentAnomaly[];
    } catch (error) {
      console.error("Error detecting payment anomalies:", error);
      return [];
    }
  },
});

// ==================== Report Summary Generation ====================

export const generateReportSummary = action({
  args: {
    reportType: v.union(
      v.literal("financial"),
      v.literal("occupancy"),
      v.literal("maintenance"),
      v.literal("compliance"),
      v.literal("participant")
    ),
    reportData: v.string(), // JSON stringified report data
  },
  handler: async (ctx, args): Promise<ReportSummary> => {
    const systemPrompt = `You are a management consultant specializing in Australian NDIS SDA (Specialist Disability Accommodation) operations.

Generate an executive summary for the ${args.reportType} report. Include:

1. **summary**: A 2-3 sentence overview of the key findings
2. **keyInsights**: 3-5 bullet points highlighting the most important data points
3. **recommendations**: 2-4 actionable recommendations based on the data
4. **riskAreas**: Any areas of concern that need attention

Context for Australian SDA:
- SDA is government-funded accommodation for NDIS participants
- Occupancy rates should ideally be >90%
- Maintenance should be completed within SLA timeframes
- Document compliance is critical for audits

Respond with JSON only:
{
  "summary": "string",
  "keyInsights": ["insight1", "insight2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "riskAreas": ["risk1", "risk2", ...]
}`;

    const userPrompt = `Generate an executive summary for this ${args.reportType} report:

${args.reportData}`;

    try {
      const response = await callClaudeAPI(systemPrompt, [
        { role: "user", content: userPrompt },
      ], 2048);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in response");
      }

      return JSON.parse(jsonMatch[0]) as ReportSummary;
    } catch (error) {
      console.error("Error generating report summary:", error);
      return {
        summary: "Unable to generate summary at this time.",
        keyInsights: [],
        recommendations: [],
        riskAreas: [],
      };
    }
  },
});

// ==================== Dashboard Insights ====================

export const getDashboardInsights = action({
  args: {},
  handler: async (ctx): Promise<{
    insights: string[];
    alerts: { type: string; message: string; severity: string }[];
  }> => {
    // Gather dashboard data
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    // This would normally query the database, but we'll simulate for now
    // In production, you'd use ctx.runQuery to fetch real data

    const systemPrompt = `You are an AI assistant for an SDA (Specialist Disability Accommodation) management system.

Based on typical SDA operations, generate helpful insights and alerts for the dashboard.

Provide:
1. insights: 3-4 general operational insights or tips
2. alerts: Any urgent items that need attention (expiring documents, overdue tasks, etc.)

Each alert should have:
- type: "expiry" | "maintenance" | "payment" | "compliance" | "vacancy"
- message: Clear description
- severity: "info" | "warning" | "critical"

Respond with JSON:
{
  "insights": ["insight1", "insight2", ...],
  "alerts": [
    { "type": "type", "message": "message", "severity": "level" }
  ]
}`;

    const userPrompt = `Generate dashboard insights for today (${today}).
Consider typical SDA operations including:
- Document expiry tracking
- Maintenance scheduling
- Payment processing
- Occupancy management
- Compliance requirements`;

    try {
      const response = await callClaudeAPI(systemPrompt, [
        { role: "user", content: userPrompt },
      ], 1024);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { insights: [], alerts: [] };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error generating dashboard insights:", error);
      return { insights: [], alerts: [] };
    }
  },
});

// ==================== Participant Risk Assessment ====================

export const assessParticipantRisk = action({
  args: {
    participantId: v.id("participants"),
  },
  handler: async (ctx, args): Promise<{
    riskLevel: "low" | "medium" | "high";
    riskFactors: string[];
    recommendations: string[];
  }> => {
    // In production, fetch participant data
    // const participant = await ctx.runQuery(api.participants.getById, { participantId: args.participantId });

    const systemPrompt = `You are a risk assessment specialist for NDIS SDA accommodation.

Assess participant risk based on:
- Plan expiry dates
- Payment history
- Accommodation stability
- Document compliance

Provide:
- riskLevel: "low" | "medium" | "high"
- riskFactors: List of identified risks
- recommendations: Actions to mitigate risks

Respond with JSON:
{
  "riskLevel": "level",
  "riskFactors": ["factor1", "factor2", ...],
  "recommendations": ["rec1", "rec2", ...]
}`;

    const userPrompt = `Assess risk for participant with ID: ${args.participantId}

Consider factors like:
- Plan renewal timeline
- Historical payment consistency
- Length of tenancy
- Compliance status`;

    try {
      const response = await callClaudeAPI(systemPrompt, [
        { role: "user", content: userPrompt },
      ], 1024);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          riskLevel: "low",
          riskFactors: [],
          recommendations: [],
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error assessing participant risk:", error);
      return {
        riskLevel: "low",
        riskFactors: ["Unable to assess at this time"],
        recommendations: ["Manual review recommended"],
      };
    }
  },
});

// ==================== Trend Analysis ====================

export const analyzeTrends = action({
  args: {
    trendType: v.union(
      v.literal("revenue"),
      v.literal("occupancy"),
      v.literal("maintenance_costs"),
      v.literal("compliance")
    ),
    periodMonths: v.number(),
  },
  handler: async (ctx, args): Promise<{
    trend: "increasing" | "decreasing" | "stable";
    percentageChange: number;
    analysis: string;
    forecast: string;
  }> => {
    const systemPrompt = `You are a business analyst specializing in NDIS SDA operations.

Analyze ${args.trendType} trends over ${args.periodMonths} months.

Provide:
- trend: "increasing" | "decreasing" | "stable"
- percentageChange: Estimated % change over the period
- analysis: Brief explanation of the trend
- forecast: Prediction for next quarter

Respond with JSON:
{
  "trend": "direction",
  "percentageChange": number,
  "analysis": "explanation",
  "forecast": "prediction"
}`;

    const userPrompt = `Analyze ${args.trendType} trends for the past ${args.periodMonths} months in an SDA management context.`;

    try {
      const response = await callClaudeAPI(systemPrompt, [
        { role: "user", content: userPrompt },
      ], 1024);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          trend: "stable",
          percentageChange: 0,
          analysis: "Unable to analyze at this time.",
          forecast: "Insufficient data for forecast.",
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error analyzing trends:", error);
      return {
        trend: "stable",
        percentageChange: 0,
        analysis: "Unable to analyze at this time.",
        forecast: "Insufficient data for forecast.",
      };
    }
  },
});
