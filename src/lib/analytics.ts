// ---------------------------------------------------------------------------
// Type-safe conversion tracking for MySDAManager
// ---------------------------------------------------------------------------

type ConversionEvent =
  | { event: "trial_signup"; value: number; method: string }
  | { event: "demo_booking"; value: number; method: string }
  | { event: "referral_signup"; value: number; referral_code: string }
  | { event: "pricing_page_view"; value: 0 }
  | { event: "lead_magnet_download"; value: 0; asset: string }
  | { event: "feature_page_view"; value: 0; feature: string };

const HIGH_VALUE_EVENTS = ["trial_signup", "demo_booking", "referral_signup"];

/**
 * Fire a conversion event to GTM dataLayer, GA4, Google Ads, and LinkedIn.
 * Safe to call server-side (no-ops when `window` is undefined).
 */
export function trackConversion(event: ConversionEvent) {
  if (typeof window === "undefined") return;

  // Push to GTM dataLayer
  if (window.dataLayer) {
    window.dataLayer.push({
      ...event,
      event: event.event,
    });
  }

  // Also fire GA4 event directly (belt + suspenders)
  if (window.gtag) {
    window.gtag("event", event.event, {
      ...event,
      value: event.value,
      currency: "AUD",
    });
  }

  // Fire Google Ads conversion (for high-value events)
  if (HIGH_VALUE_EVENTS.includes(event.event)) {
    if (window.gtag) {
      const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
      if (googleAdsId) {
        window.gtag("event", "conversion", {
          send_to: `${googleAdsId}/CONVERSION_LABEL_HERE`,
          value: event.value,
          currency: "AUD",
        });
      }
    }

    // Fire LinkedIn conversion
    if (window.lintrk) {
      window.lintrk("track", { conversion_id: 0 }); // ID configured in LinkedIn Campaign Manager
    }
  }
}

/**
 * Track page views for specific marketing pages.
 */
export function trackPageView(pageName: string, pageUrl?: string) {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_title: pageName,
      page_location: pageUrl || window.location.href,
    });
  }
}

// ---------------------------------------------------------------------------
// Global type declarations for third-party analytics libraries
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
    gtag: (...args: unknown[]) => void;
    lintrk: (action: string, data: Record<string, unknown>) => void;
  }
}
