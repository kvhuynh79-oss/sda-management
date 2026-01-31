/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiAnalytics from "../aiAnalytics.js";
import type * as aiChatbot from "../aiChatbot.js";
import type * as aiDocuments from "../aiDocuments.js";
import type * as aiParsing from "../aiParsing.js";
import type * as aiUtils from "../aiUtils.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as claims from "../claims.js";
import type * as contractors from "../contractors.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as dwellings from "../dwellings.js";
import type * as fixPaulDwelling from "../fixPaulDwelling.js";
import type * as incidents from "../incidents.js";
import type * as inspections from "../inspections.js";
import type * as maintenancePhotos from "../maintenancePhotos.js";
import type * as maintenanceQuotes from "../maintenanceQuotes.js";
import type * as maintenanceRequests from "../maintenanceRequests.js";
import type * as ndisClaimExport from "../ndisClaimExport.js";
import type * as notifications from "../notifications.js";
import type * as ownerDistributions from "../ownerDistributions.js";
import type * as owners from "../owners.js";
import type * as participantPlans from "../participantPlans.js";
import type * as participants from "../participants.js";
import type * as payments from "../payments.js";
import type * as preventativeSchedule from "../preventativeSchedule.js";
import type * as preventativeScheduleTemplates from "../preventativeScheduleTemplates.js";
import type * as properties from "../properties.js";
import type * as propertyMedia from "../propertyMedia.js";
import type * as providerSettings from "../providerSettings.js";
import type * as quoteRequests from "../quoteRequests.js";
import type * as reports from "../reports.js";
import type * as seedAnneMarie from "../seedAnneMarie.js";
import type * as seedAnneMariePayments from "../seedAnneMariePayments.js";
import type * as seedDanielChetty from "../seedDanielChetty.js";
import type * as seedJoshRoss from "../seedJoshRoss.js";
import type * as seedMarcelLaaban from "../seedMarcelLaaban.js";
import type * as seedPaulMortensen from "../seedPaulMortensen.js";
import type * as seedPaulMortensenPayments from "../seedPaulMortensenPayments.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiAnalytics: typeof aiAnalytics;
  aiChatbot: typeof aiChatbot;
  aiDocuments: typeof aiDocuments;
  aiParsing: typeof aiParsing;
  aiUtils: typeof aiUtils;
  alerts: typeof alerts;
  auth: typeof auth;
  claims: typeof claims;
  contractors: typeof contractors;
  crons: typeof crons;
  documents: typeof documents;
  dwellings: typeof dwellings;
  fixPaulDwelling: typeof fixPaulDwelling;
  incidents: typeof incidents;
  inspections: typeof inspections;
  maintenancePhotos: typeof maintenancePhotos;
  maintenanceQuotes: typeof maintenanceQuotes;
  maintenanceRequests: typeof maintenanceRequests;
  ndisClaimExport: typeof ndisClaimExport;
  notifications: typeof notifications;
  ownerDistributions: typeof ownerDistributions;
  owners: typeof owners;
  participantPlans: typeof participantPlans;
  participants: typeof participants;
  payments: typeof payments;
  preventativeSchedule: typeof preventativeSchedule;
  preventativeScheduleTemplates: typeof preventativeScheduleTemplates;
  properties: typeof properties;
  propertyMedia: typeof propertyMedia;
  providerSettings: typeof providerSettings;
  quoteRequests: typeof quoteRequests;
  reports: typeof reports;
  seedAnneMarie: typeof seedAnneMarie;
  seedAnneMariePayments: typeof seedAnneMariePayments;
  seedDanielChetty: typeof seedDanielChetty;
  seedJoshRoss: typeof seedJoshRoss;
  seedMarcelLaaban: typeof seedMarcelLaaban;
  seedPaulMortensen: typeof seedPaulMortensen;
  seedPaulMortensenPayments: typeof seedPaulMortensenPayments;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
