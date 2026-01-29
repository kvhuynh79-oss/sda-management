/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as dwellings from "../dwellings.js";
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
import type * as reports from "../reports.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  auth: typeof auth;
  crons: typeof crons;
  documents: typeof documents;
  dwellings: typeof dwellings;
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
  reports: typeof reports;
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
