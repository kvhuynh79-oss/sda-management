"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * OrganizationContext - Sprint 1 Multi-Tenant Context
 *
 * Provides organization-level context throughout the app for tenant isolation.
 * This context layer sits between AuthProvider and the rest of the app.
 *
 * During Sprint 1 (migration phase), organizationId is optional.
 * After Sprint 2 (query refactoring), all data will be scoped by organization.
 */

// Plan tier definitions
type PlanTier = "starter" | "professional" | "enterprise";

interface PlanLimits {
  maxUsers: number;
  maxProperties: number;
  features: {
    mfa: boolean;
    whiteLabel: boolean;
    api: boolean;
    customReports: boolean;
    advancedWorkflows: boolean;
  };
}

// Organization data shape
export interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  plan: PlanTier;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
  maxUsers: number;
  maxProperties: number;
  primaryColor?: string;
  logoUrl?: string;
  resolvedLogoUrl?: string;
  isActive: boolean;
  settings?: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    fiscalYearStart?: string;
    complianceRegion?: string;
  };
}

// Context value interface
interface OrganizationContextValue {
  organization: Organization | null;
  isLoading: boolean;
  planLimits: PlanLimits | null;
  canAddUser: boolean;
  canAddProperty: boolean;
  hasFeature: (feature: keyof PlanLimits["features"]) => boolean;
}

// Create context with default values
const OrganizationContext = createContext<OrganizationContextValue>({
  organization: null,
  isLoading: true,
  planLimits: null,
  canAddUser: false,
  canAddProperty: false,
  hasFeature: () => false,
});

// Plan tier feature matrix
const PLAN_FEATURES: Record<PlanTier, PlanLimits> = {
  starter: {
    maxUsers: 5,
    maxProperties: 50,
    features: {
      mfa: false,
      whiteLabel: false,
      api: false,
      customReports: false,
      advancedWorkflows: false,
    },
  },
  professional: {
    maxUsers: 20,
    maxProperties: 200,
    features: {
      mfa: true,
      whiteLabel: false,
      api: true,
      customReports: true,
      advancedWorkflows: true,
    },
  },
  enterprise: {
    maxUsers: 999999, // "Unlimited"
    maxProperties: 999999,
    features: {
      mfa: true,
      whiteLabel: true,
      api: true,
      customReports: true,
      advancedWorkflows: true,
    },
  },
};

interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * OrganizationProvider
 * Wraps the app to provide organization context.
 * Self-bootstraps by reading userId from localStorage (sda_user),
 * then fetching the user's organizationId from the DB.
 *
 * Usage in layout.tsx:
 *   <OrganizationProvider>{children}</OrganizationProvider>
 */
export function OrganizationProvider({
  children,
}: OrganizationProviderProps) {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);

  // Read userId from localStorage (same pattern as useAuth)
  useEffect(() => {
    const readUser = () => {
      const stored = localStorage.getItem("sda_user");
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          if (userData.id) {
            setUserId(userData.id as Id<"users">);
          } else {
            setUserId(null);
          }
        } catch {
          setUserId(null);
        }
      } else {
        setUserId(null);
      }
    };

    readUser();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sda_user") readUser();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Step 1: Get user record (includes organizationId)
  const dbUser = useQuery(
    userId ? api.auth.getUser : ("skip" as any),
    userId ? { userId } : ("skip" as any)
  );

  // Step 2: Fetch the full organization
  const organizationId = dbUser?.organizationId as Id<"organizations"> | undefined;
  const organization = useQuery(
    userId && organizationId ? api.organizations.getById : ("skip" as any),
    userId && organizationId ? { userId, organizationId } : ("skip" as any)
  ) as Organization | undefined;

  const isLoading = userId ? organization === undefined : false;

  // Calculate plan limits and feature flags
  const planLimits = organization ? PLAN_FEATURES[organization.plan] : null;

  // Check if org can add more users (based on current count vs limit)
  // TODO: In Sprint 2, query actual user count for this org
  const canAddUser = planLimits ? true : false; // Simplified for Sprint 1

  // Check if org can add more properties (based on current count vs limit)
  // TODO: In Sprint 2, query actual property count for this org
  const canAddProperty = planLimits ? true : false; // Simplified for Sprint 1

  // Feature flag checker
  const hasFeature = (feature: keyof PlanLimits["features"]) => {
    return planLimits ? planLimits.features[feature] : false;
  };

  const contextValue: OrganizationContextValue = {
    organization: organization || null,
    isLoading,
    planLimits,
    canAddUser,
    canAddProperty,
    hasFeature,
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * useOrganization Hook
 * Access organization context from any component
 *
 * Example:
 * const { organization, hasFeature, canAddProperty } = useOrganization();
 * if (!hasFeature('api')) {
 *   return <UpgradePrompt feature="API Access" />;
 * }
 */
export function useOrganization() {
  const context = useContext(OrganizationContext);

  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }

  return context;
}
