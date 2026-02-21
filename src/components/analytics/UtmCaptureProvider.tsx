"use client";

import { useUtmCapture } from "@/hooks/useUtmCapture";

/**
 * Client component wrapper that captures UTM parameters and click IDs
 * from the URL on page load. Designed to be placed in a layout so it
 * runs on every page without making the layout itself a client component.
 */
export function UtmCaptureProvider({ children }: { children: React.ReactNode }) {
  useUtmCapture();
  return <>{children}</>;
}
