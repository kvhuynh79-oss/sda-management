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
import type * as aiDocumentAnalysis from "../aiDocumentAnalysis.js";
import type * as aiDocuments from "../aiDocuments.js";
import type * as aiParsing from "../aiParsing.js";
import type * as aiTools from "../aiTools.js";
import type * as aiUtils from "../aiUtils.js";
import type * as alertHelpers from "../alertHelpers.js";
import type * as alerts from "../alerts.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiQueries from "../apiQueries.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as bankAccounts from "../bankAccounts.js";
import type * as bankTransactions from "../bankTransactions.js";
import type * as businessContinuityPlans from "../businessContinuityPlans.js";
import type * as calendar from "../calendar.js";
import type * as claims from "../claims.js";
import type * as communications from "../communications.js";
import type * as complaints from "../complaints.js";
import type * as complianceCertifications from "../complianceCertifications.js";
import type * as contractors from "../contractors.js";
import type * as crons from "../crons.js";
import type * as dataExport from "../dataExport.js";
import type * as documents from "../documents.js";
import type * as dwellings from "../dwellings.js";
import type * as emergencyManagementPlans from "../emergencyManagementPlans.js";
import type * as expectedPayments from "../expectedPayments.js";
import type * as fixPaulDwelling from "../fixPaulDwelling.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as googleCalendarHelpers from "../googleCalendarHelpers.js";
import type * as inboundEmail from "../inboundEmail.js";
import type * as incidentActions from "../incidentActions.js";
import type * as incidents from "../incidents.js";
import type * as inspections from "../inspections.js";
import type * as insurancePolicies from "../insurancePolicies.js";
import type * as launchChecklist from "../launchChecklist.js";
import type * as leads from "../leads.js";
import type * as lib_consultationGate from "../lib/consultationGate.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_passwordValidation from "../lib/passwordValidation.js";
import type * as lib_threadingEngine from "../lib/threadingEngine.js";
import type * as maintenancePhotos from "../maintenancePhotos.js";
import type * as maintenanceQuotes from "../maintenanceQuotes.js";
import type * as maintenanceRequests from "../maintenanceRequests.js";
import type * as marketingLeads from "../marketingLeads.js";
import type * as mfa from "../mfa.js";
import type * as migrations_encryptExistingData from "../migrations/encryptExistingData.js";
import type * as mtaClaims from "../mtaClaims.js";
import type * as ndisClaimExport from "../ndisClaimExport.js";
import type * as notificationHelpers from "../notificationHelpers.js";
import type * as notifications from "../notifications.js";
import type * as occupationalTherapists from "../occupationalTherapists.js";
import type * as organizations from "../organizations.js";
import type * as outlookCalendar from "../outlookCalendar.js";
import type * as outlookCalendarDb from "../outlookCalendarDb.js";
import type * as ownerDistributions from "../ownerDistributions.js";
import type * as ownerPayments from "../ownerPayments.js";
import type * as owners from "../owners.js";
import type * as paginationHelpers from "../paginationHelpers.js";
import type * as participantPlans from "../participantPlans.js";
import type * as participants from "../participants.js";
import type * as payments from "../payments.js";
import type * as policies from "../policies.js";
import type * as preventativeSchedule from "../preventativeSchedule.js";
import type * as preventativeScheduleTemplates from "../preventativeScheduleTemplates.js";
import type * as properties from "../properties.js";
import type * as propertyMedia from "../propertyMedia.js";
import type * as providerSettings from "../providerSettings.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as quoteRequests from "../quoteRequests.js";
import type * as registration from "../registration.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as seedAnneMarie from "../seedAnneMarie.js";
import type * as seedAnneMariePayments from "../seedAnneMariePayments.js";
import type * as seedDanielChetty from "../seedDanielChetty.js";
import type * as seedJoshRoss from "../seedJoshRoss.js";
import type * as seedMarcelLaaban from "../seedMarcelLaaban.js";
import type * as seedPaulMortensen from "../seedPaulMortensen.js";
import type * as seedPaulMortensenPayments from "../seedPaulMortensenPayments.js";
import type * as silProviderPortal from "../silProviderPortal.js";
import type * as silProviders from "../silProviders.js";
import type * as staff from "../staff.js";
import type * as stripe from "../stripe.js";
import type * as superAdmin from "../superAdmin.js";
import type * as supportCoordinators from "../supportCoordinators.js";
import type * as supportTickets from "../supportTickets.js";
import type * as tasks from "../tasks.js";
import type * as vacancyListings from "../vacancyListings.js";
import type * as validationHelpers from "../validationHelpers.js";
import type * as webhooks from "../webhooks.js";
import type * as xero from "../xero.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiAnalytics: typeof aiAnalytics;
  aiChatbot: typeof aiChatbot;
  aiDocumentAnalysis: typeof aiDocumentAnalysis;
  aiDocuments: typeof aiDocuments;
  aiParsing: typeof aiParsing;
  aiTools: typeof aiTools;
  aiUtils: typeof aiUtils;
  alertHelpers: typeof alertHelpers;
  alerts: typeof alerts;
  apiKeys: typeof apiKeys;
  apiQueries: typeof apiQueries;
  auditLog: typeof auditLog;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  bankAccounts: typeof bankAccounts;
  bankTransactions: typeof bankTransactions;
  businessContinuityPlans: typeof businessContinuityPlans;
  calendar: typeof calendar;
  claims: typeof claims;
  communications: typeof communications;
  complaints: typeof complaints;
  complianceCertifications: typeof complianceCertifications;
  contractors: typeof contractors;
  crons: typeof crons;
  dataExport: typeof dataExport;
  documents: typeof documents;
  dwellings: typeof dwellings;
  emergencyManagementPlans: typeof emergencyManagementPlans;
  expectedPayments: typeof expectedPayments;
  fixPaulDwelling: typeof fixPaulDwelling;
  googleCalendar: typeof googleCalendar;
  googleCalendarHelpers: typeof googleCalendarHelpers;
  inboundEmail: typeof inboundEmail;
  incidentActions: typeof incidentActions;
  incidents: typeof incidents;
  inspections: typeof inspections;
  insurancePolicies: typeof insurancePolicies;
  launchChecklist: typeof launchChecklist;
  leads: typeof leads;
  "lib/consultationGate": typeof lib_consultationGate;
  "lib/encryption": typeof lib_encryption;
  "lib/passwordValidation": typeof lib_passwordValidation;
  "lib/threadingEngine": typeof lib_threadingEngine;
  maintenancePhotos: typeof maintenancePhotos;
  maintenanceQuotes: typeof maintenanceQuotes;
  maintenanceRequests: typeof maintenanceRequests;
  marketingLeads: typeof marketingLeads;
  mfa: typeof mfa;
  "migrations/encryptExistingData": typeof migrations_encryptExistingData;
  mtaClaims: typeof mtaClaims;
  ndisClaimExport: typeof ndisClaimExport;
  notificationHelpers: typeof notificationHelpers;
  notifications: typeof notifications;
  occupationalTherapists: typeof occupationalTherapists;
  organizations: typeof organizations;
  outlookCalendar: typeof outlookCalendar;
  outlookCalendarDb: typeof outlookCalendarDb;
  ownerDistributions: typeof ownerDistributions;
  ownerPayments: typeof ownerPayments;
  owners: typeof owners;
  paginationHelpers: typeof paginationHelpers;
  participantPlans: typeof participantPlans;
  participants: typeof participants;
  payments: typeof payments;
  policies: typeof policies;
  preventativeSchedule: typeof preventativeSchedule;
  preventativeScheduleTemplates: typeof preventativeScheduleTemplates;
  properties: typeof properties;
  propertyMedia: typeof propertyMedia;
  providerSettings: typeof providerSettings;
  pushSubscriptions: typeof pushSubscriptions;
  quoteRequests: typeof quoteRequests;
  registration: typeof registration;
  reports: typeof reports;
  seed: typeof seed;
  seedAnneMarie: typeof seedAnneMarie;
  seedAnneMariePayments: typeof seedAnneMariePayments;
  seedDanielChetty: typeof seedDanielChetty;
  seedJoshRoss: typeof seedJoshRoss;
  seedMarcelLaaban: typeof seedMarcelLaaban;
  seedPaulMortensen: typeof seedPaulMortensen;
  seedPaulMortensenPayments: typeof seedPaulMortensenPayments;
  silProviderPortal: typeof silProviderPortal;
  silProviders: typeof silProviders;
  staff: typeof staff;
  stripe: typeof stripe;
  superAdmin: typeof superAdmin;
  supportCoordinators: typeof supportCoordinators;
  supportTickets: typeof supportTickets;
  tasks: typeof tasks;
  vacancyListings: typeof vacancyListings;
  validationHelpers: typeof validationHelpers;
  webhooks: typeof webhooks;
  xero: typeof xero;
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
