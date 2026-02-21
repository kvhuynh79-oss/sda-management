"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed
    if (sessionStorage.getItem("mysda_sticky_dismissed") === "true") {
      setIsDismissed(true);
      return;
    }

    // Watch for hero CTA scrolling out of view
    const handleScroll = () => {
      // Show sticky bar after scrolling 600px (past hero section)
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("mysda_sticky_dismissed", "true");
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transform transition-transform duration-300 ease-out"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="bg-teal-600 shadow-lg shadow-teal-900/40 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            14-Day Free Trial — No Card Required
          </p>
        </div>
        <Link
          href="/register"
          className="flex-shrink-0 bg-white text-teal-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Start Trial
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 text-teal-200 hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
