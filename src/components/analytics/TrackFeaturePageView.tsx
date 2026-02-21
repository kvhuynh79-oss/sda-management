"use client";

import { useEffect } from "react";
import { trackConversion } from "@/lib/analytics";

/**
 * Client component that fires a feature_page_view conversion event on mount.
 * Used inside server components that cannot use useEffect directly.
 */
export default function TrackFeaturePageView() {
  useEffect(() => {
    trackConversion({ event: "feature_page_view", value: 0, feature: "features_page" });
  }, []);

  return null;
}
