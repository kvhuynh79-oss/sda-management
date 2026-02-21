"use client";

import { useEffect } from "react";

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_IDS = ["gclid", "msclkid", "li_fat_id", "fbclid"] as const;
const STORAGE_KEY = "mysda_attribution";

export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  msclkid?: string;
  li_fat_id?: string;
  fbclid?: string;
  referral_code?: string;
  landing_page?: string;
  timestamp?: string;
};

/**
 * Hook to capture UTM parameters and click IDs from the URL on page load.
 * Stores attribution data in sessionStorage so it persists across
 * navigation within the same session but does not leak across sessions.
 *
 * Place this in a layout or provider that wraps all marketing and
 * registration pages.
 */
export function useUtmCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const data: AttributionData = {};
    let hasData = false;

    for (const key of UTM_PARAMS) {
      const value = params.get(key);
      if (value) {
        data[key] = value;
        hasData = true;
      }
    }

    for (const key of CLICK_IDS) {
      const value = params.get(key);
      if (value) {
        data[key] = value;
        hasData = true;
      }
    }

    const ref = params.get("ref") || params.get("referral");
    if (ref) {
      data.referral_code = ref;
      hasData = true;
    }

    // Only store if we found something new (don't overwrite existing with empty)
    if (hasData) {
      data.landing_page = window.location.pathname;
      data.timestamp = new Date().toISOString();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, []);
}

/**
 * Retrieve stored attribution data from sessionStorage.
 * Returns null if no attribution data has been captured.
 */
export function getAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}
