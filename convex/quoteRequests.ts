import { v } from "convex/values";
import { mutation, query, action, internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate a random token for quote submissions
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Get quote requests for a maintenance request
export const getByMaintenanceRequest = query({
  args: { maintenanceRequestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", args.maintenanceRequestId)
      )
      .collect();

    // Get contractor details for each request
    const requestsWithContractors = await Promise.all(
      requests.map(async (request) => {
        const contractor = await ctx.db.get(request.contractorId);
        return {
          ...request,
          contractor,
        };
      })
    );

    return requestsWithContractors;
  },
});

// Get quote request by token (for public quote submission page)
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) return null;

    // Get maintenance request details
    const maintenanceRequest = await ctx.db.get(request.maintenanceRequestId);
    if (!maintenanceRequest) return null;

    // Get dwelling and property
    const dwelling = await ctx.db.get(maintenanceRequest.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    // Get photos
    const photos = await ctx.db
      .query("maintenancePhotos")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", maintenanceRequest._id)
      )
      .collect();

    // Get photo URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    // Get contractor
    const contractor = await ctx.db.get(request.contractorId);

    return {
      quoteRequest: request,
      maintenanceRequest,
      dwelling,
      property: property
        ? {
            _id: property._id,
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
            state: property.state,
            postcode: property.postcode,
          }
        : null,
      photos: photosWithUrls,
      contractor,
    };
  },
});

// Create a quote request (internal - called after sending email)
export const create = mutation({
  args: {
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorId: v.id("contractors"),
    emailSubject: v.string(),
    emailBody: v.string(),
    includesPhotos: v.boolean(),
    expiryDays: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = generateToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + args.expiryDays);

    const requestId = await ctx.db.insert("quoteRequests", {
      maintenanceRequestId: args.maintenanceRequestId,
      contractorId: args.contractorId,
      requestToken: token,
      emailSentAt: Date.now(),
      emailSubject: args.emailSubject,
      emailBody: args.emailBody,
      includesPhotos: args.includesPhotos,
      status: "sent",
      expiryDate: expiryDate.toISOString().split("T")[0],
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Update maintenance request status
    await ctx.db.patch(args.maintenanceRequestId, {
      status: "awaiting_quotes",
      updatedAt: Date.now(),
    });

    return { requestId, token };
  },
});

// Mark quote request as viewed
export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (request && request.status === "sent") {
      await ctx.db.patch(request._id, {
        status: "viewed",
        viewedAt: Date.now(),
      });
    }
  },
});

// Submit a quote via public link
export const submitQuote = mutation({
  args: {
    token: v.string(),
    quoteAmount: v.number(),
    laborCost: v.optional(v.number()),
    materialsCost: v.optional(v.number()),
    estimatedDays: v.optional(v.number()),
    availableDate: v.optional(v.string()),
    warrantyMonths: v.optional(v.number()),
    description: v.optional(v.string()),
    validDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) throw new Error("Invalid quote request token");
    if (request.status === "expired") throw new Error("Quote request has expired");
    if (request.status === "quoted") throw new Error("Quote already submitted");

    // Check if expired by date
    if (new Date(request.expiryDate) < new Date()) {
      await ctx.db.patch(request._id, { status: "expired" });
      throw new Error("Quote request has expired");
    }

    const contractor = await ctx.db.get(request.contractorId);
    if (!contractor) throw new Error("Contractor not found");

    // Calculate valid until date
    const validUntil = args.validDays
      ? new Date(Date.now() + args.validDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : undefined;

    // Create the quote
    const quoteId = await ctx.db.insert("maintenanceQuotes", {
      maintenanceRequestId: request.maintenanceRequestId,
      contractorId: request.contractorId,
      contractorName: contractor.companyName,
      contractorContact: contractor.phone,
      contractorEmail: contractor.email,
      quoteAmount: args.quoteAmount,
      laborCost: args.laborCost,
      materialsCost: args.materialsCost,
      quoteDate: new Date().toISOString().split("T")[0],
      validUntil,
      estimatedDays: args.estimatedDays,
      availableDate: args.availableDate,
      warrantyMonths: args.warrantyMonths,
      description: args.description,
      status: "pending",
      quoteRequestId: request._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update quote request status
    await ctx.db.patch(request._id, {
      status: "quoted",
      respondedAt: Date.now(),
    });

    // Check if all quote requests for this maintenance request have been responded to
    const allRequests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", request.maintenanceRequestId)
      )
      .collect();

    const allResponded = allRequests.every(
      (r) => r.status === "quoted" || r.status === "declined" || r.status === "expired"
    );

    if (allResponded) {
      await ctx.db.patch(request.maintenanceRequestId, {
        status: "quoted",
        updatedAt: Date.now(),
      });
    }

    // Update contractor stats
    await ctx.db.patch(request.contractorId, {
      totalJobsCompleted: (contractor.totalJobsCompleted || 0) + 1,
      updatedAt: Date.now(),
    });

    return quoteId;
  },
});

// Decline to quote
export const declineQuote = mutation({
  args: {
    token: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) throw new Error("Invalid quote request token");

    await ctx.db.patch(request._id, {
      status: "declined",
      respondedAt: Date.now(),
      notes: args.reason,
    });

    return true;
  },
});

// Get all pending quote requests (for admin dashboard)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const contractor = await ctx.db.get(request.contractorId);
        const maintenanceRequest = await ctx.db.get(request.maintenanceRequestId);
        const dwelling = maintenanceRequest
          ? await ctx.db.get(maintenanceRequest.dwellingId)
          : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          contractor,
          maintenanceRequest,
          property: property
            ? {
                propertyName: property.propertyName,
                addressLine1: property.addressLine1,
                suburb: property.suburb,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

// ============================================
// EMAIL SENDING FUNCTIONALITY
// ============================================

// Internal mutation to get quote request data for email
export const getQuoteRequestData = internalMutation({
  args: { quoteRequestId: v.id("quoteRequests") },
  handler: async (ctx, args) => {
    const quoteRequest = await ctx.db.get(args.quoteRequestId);
    if (!quoteRequest) throw new Error("Quote request not found");

    const contractor = await ctx.db.get(quoteRequest.contractorId);
    if (!contractor) throw new Error("Contractor not found");

    const maintenanceRequest = await ctx.db.get(quoteRequest.maintenanceRequestId);
    if (!maintenanceRequest) throw new Error("Maintenance request not found");

    const dwelling = await ctx.db.get(maintenanceRequest.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    // Get photos
    const photos = await ctx.db
      .query("maintenancePhotos")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", maintenanceRequest._id)
      )
      .collect();

    // Get photo URLs
    const photoUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return url;
      })
    );

    return {
      quoteRequest,
      contractor,
      maintenanceRequest,
      dwelling,
      property,
      photoUrls: photoUrls.filter(Boolean) as string[],
    };
  },
});

// Internal action to send quote request email
export const sendQuoteRequestEmail = internalAction({
  args: {
    quoteRequestId: v.id("quoteRequests"),
    baseUrl: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get quote request data
    const data: any = await ctx.runMutation(internal.quoteRequests.getQuoteRequestData, {
      quoteRequestId: args.quoteRequestId,
    });

    const { quoteRequest, contractor, maintenanceRequest, dwelling, property, photoUrls } = data;

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Quote request email skipped.");
      return {
        success: false,
        error: "RESEND_API_KEY not configured. Add it to environment variables.",
      };
    }

    // Build quote submission URL
    const quoteUrl = `${args.baseUrl}/quote/${quoteRequest.requestToken}`;

    // Build photo gallery HTML if photos exist
    const photoGalleryHtml = quoteRequest.includesPhotos && photoUrls.length > 0
      ? `
        <div style="margin-top: 24px;">
          <h3 style="color: #374151; margin-bottom: 12px;">Photos (${photoUrls.length})</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${photoUrls.slice(0, 6).map((url: string) => `
              <a href="${url}" target="_blank" style="display: block; width: 100px; height: 100px; border-radius: 8px; overflow: hidden;">
                <img src="${url}" alt="Issue photo" style="width: 100%; height: 100%; object-fit: cover;" />
              </a>
            `).join("")}
            ${photoUrls.length > 6 ? `<p style="color: #6b7280; font-size: 14px;">+${photoUrls.length - 6} more photos</p>` : ""}
          </div>
        </div>
      `
      : "";

    // Priority colors
    const priorityColors: Record<string, string> = {
      urgent: "#dc2626",
      high: "#ea580c",
      medium: "#eab308",
      low: "#6b7280",
    };

    const priorityColor = priorityColors[maintenanceRequest.priority] || "#6b7280";

    try {
      const response: any = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "quotes@betterlivingsolutions.com.au",
          to: contractor.email,
          subject: quoteRequest.emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Quote Request</h1>
                    <p style="color: #d1d5db; margin: 8px 0 0 0;">Better Living Solutions</p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 30px;">
                    <p style="color: #374151; margin: 0 0 20px 0;">
                      Hi ${contractor.contactName || contractor.companyName},
                    </p>

                    <p style="color: #374151; margin: 0 0 24px 0;">
                      We have a maintenance request and would like to request a quote from you.
                    </p>

                    <!-- Job Details Card -->
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <h2 style="color: #111827; margin: 0; font-size: 18px;">${maintenanceRequest.title}</h2>
                        <span style="background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                          ${maintenanceRequest.priority}
                        </span>
                      </div>

                      <div style="margin-bottom: 16px;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">Location</p>
                        <p style="color: #111827; margin: 0; font-weight: 500;">
                          ${property?.addressLine1 || "Address not available"}<br>
                          ${property?.suburb || ""}, ${property?.state || ""} ${property?.postcode || ""}
                        </p>
                        ${dwelling ? `<p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">Dwelling: ${dwelling.dwellingName}</p>` : ""}
                      </div>

                      <div style="margin-bottom: 16px;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">Category</p>
                        <p style="color: #111827; margin: 0; text-transform: capitalize;">${maintenanceRequest.category}</p>
                      </div>

                      <div>
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">Description</p>
                        <p style="color: #374151; margin: 0;">${maintenanceRequest.description}</p>
                      </div>

                      ${photoGalleryHtml}
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${quoteUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        Submit Your Quote
                      </a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 24px 0;">
                      Or copy and paste this link: <br>
                      <a href="${quoteUrl}" style="color: #2563eb; word-break: break-all;">${quoteUrl}</a>
                    </p>

                    <!-- What to Include -->
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 24px;">
                      <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 14px;">Please include in your quote:</h3>
                      <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
                        <li>Total quote amount</li>
                        <li>Labor and materials breakdown (optional)</li>
                        <li>Estimated time to complete</li>
                        <li>Earliest availability</li>
                        <li>Warranty offered</li>
                      </ul>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                      This quote request expires on <strong>${quoteRequest.expiryDate}</strong>.
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                      Better Living Solutions - SDA Property Management
                    </p>
                    <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 11px;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", responseData);
        return { success: false, error: responseData };
      }

      return { success: true, emailId: responseData.id };
    } catch (error) {
      console.error("Error sending quote request email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Action to create quote request and send email
export const createAndSendEmail = action({
  args: {
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorId: v.id("contractors"),
    emailSubject: v.string(),
    emailBody: v.string(),
    includesPhotos: v.boolean(),
    expiryDays: v.number(),
    createdBy: v.id("users"),
    baseUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    requestId?: Id<"quoteRequests">;
    token?: string;
    emailSent?: boolean;
    emailError?: string;
  }> => {
    // Create the quote request
    const createResult = await ctx.runMutation(api.quoteRequests.create, {
      maintenanceRequestId: args.maintenanceRequestId,
      contractorId: args.contractorId,
      emailSubject: args.emailSubject,
      emailBody: args.emailBody,
      includesPhotos: args.includesPhotos,
      expiryDays: args.expiryDays,
      createdBy: args.createdBy,
    });

    // Send the email
    const emailResult: { success: boolean; error?: string } =
      await ctx.runAction(internal.quoteRequests.sendQuoteRequestEmail, {
        quoteRequestId: createResult.requestId,
        baseUrl: args.baseUrl,
      });

    return {
      success: true,
      requestId: createResult.requestId,
      token: createResult.token,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    };
  },
});