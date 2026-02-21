"use client";

import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  slug: string;
  title: string;
}

export function ShareButton({ slug, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  async function handleCopyUrl() {
    const url = `https://mysdamanager.com/blog/${slug}`;
    try {
      // Try native share API on mobile first
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        /Mobi|Android/i.test(navigator.userAgent)
      ) {
        await navigator.share({ title, url });
        return;
      }

      // Fallback to clipboard copy
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Silently fail if clipboard/share not available
    }
  }

  return (
    <button
      onClick={handleCopyUrl}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      aria-label={copied ? "Link copied" : "Copy link to article"}
    >
      {copied ? (
        <>
          <svg
            className="w-4 h-4 text-teal-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          <span className="text-teal-400">Copied!</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.87"
            />
          </svg>
          Copy link
        </>
      ) }
    </button>
  );
}
