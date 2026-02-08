"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

/** Storage keys */
const PIN_HASH_KEY = "sda_lock_pin_hash";
const LOCK_STATE_KEY = "sda_lock_active";
const LOCK_TIMESTAMP_KEY = "sda_lock_timestamp";

/** Timeout defaults in milliseconds */
const ADMIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Simple hash function for the 4-digit PIN.
 * Uses the SubtleCrypto API when available, falls back to a basic hash.
 * The result is stored in sessionStorage so it only persists for the browser session.
 */
async function hashPin(pin: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "sda_lock_salt_2026");
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: basic string hash (still adequate for a local PIN)
  let hash = 0;
  const salted = pin + "sda_lock_salt_2026";
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

interface UseInactivityLockReturn {
  /** Whether the screen is currently locked */
  isLocked: boolean;
  /** Attempt to unlock with a PIN. Returns true on success. */
  unlock: (pin: string) => Promise<boolean>;
  /** Lock the screen immediately */
  lockNow: () => void;
  /** Milliseconds remaining before auto-lock. -1 when locked or no PIN set. */
  remainingTime: number;
  /** Whether a PIN has been configured for this session */
  hasPinSet: boolean;
  /** Set a new PIN for the session */
  setPin: (pin: string) => Promise<void>;
}

/**
 * Detects user inactivity and triggers a lock screen for NDIS data protection.
 *
 * - Configurable timeout: 5 minutes for admin, 15 minutes for other roles.
 * - Pauses the timer when the document is hidden (tab switch).
 * - Resets the timer on mouse, keyboard, touch, and scroll activity.
 * - Does NOT lock if the user is on the login page.
 * - If no PIN is set, isLocked stays false until the user configures one.
 */
export function useInactivityLock(
  userRole?: string
): UseInactivityLockReturn {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const timeoutMs =
    userRole === "admin" ? ADMIN_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const [isLocked, setIsLocked] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [remainingTime, setRemainingTime] = useState(-1);

  // Refs to avoid stale closures in event listeners
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const pausedRemainingRef = useRef<number>(timeoutMs);
  const isLockedRef = useRef(false);

  // Keep the ref in sync with state
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Check if PIN exists on mount and restore lock state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedHash = sessionStorage.getItem(PIN_HASH_KEY);
    setHasPinSet(!!storedHash);

    // Restore lock state if the page was refreshed while locked
    const wasLocked = sessionStorage.getItem(LOCK_STATE_KEY) === "true";
    if (wasLocked && storedHash && !isLoginPage) {
      setIsLocked(true);
    }
  }, [isLoginPage]);

  // Persist lock state changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLocked) {
      sessionStorage.setItem(LOCK_STATE_KEY, "true");
      sessionStorage.setItem(LOCK_TIMESTAMP_KEY, Date.now().toString());
    } else {
      sessionStorage.removeItem(LOCK_STATE_KEY);
      sessionStorage.removeItem(LOCK_TIMESTAMP_KEY);
    }
  }, [isLocked]);

  /** Reset the inactivity timer on user interaction */
  const resetTimer = useCallback(() => {
    if (isLockedRef.current || isPausedRef.current) return;
    lastActivityRef.current = Date.now();
    pausedRemainingRef.current = timeoutMs;
  }, [timeoutMs]);

  /** Set a new PIN for the session */
  const setPin = useCallback(async (pin: string) => {
    const hashed = await hashPin(pin);
    sessionStorage.setItem(PIN_HASH_KEY, hashed);
    setHasPinSet(true);
    lastActivityRef.current = Date.now();
    pausedRemainingRef.current = timeoutMs;
  }, [timeoutMs]);

  /** Lock the screen immediately */
  const lockNow = useCallback(() => {
    if (isLoginPage) return;
    const storedHash = sessionStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) return; // Cannot lock without a PIN
    setIsLocked(true);
  }, [isLoginPage]);

  /** Attempt to unlock with a PIN */
  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const storedHash = sessionStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) return false;

    const inputHash = await hashPin(pin);
    if (inputHash === storedHash) {
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      pausedRemainingRef.current = timeoutMs;
      return true;
    }
    return false;
  }, [timeoutMs]);

  // Main inactivity detection loop
  useEffect(() => {
    if (typeof window === "undefined" || isLoginPage) return;

    // Activity events to listen for
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Visibility change: pause/resume timer when tab is hidden/visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause: record how much time was remaining
        const elapsed = Date.now() - lastActivityRef.current;
        pausedRemainingRef.current = Math.max(0, timeoutMs - elapsed);
        isPausedRef.current = true;
      } else {
        // Resume: shift lastActivity so the remaining time is preserved
        isPausedRef.current = false;
        lastActivityRef.current =
          Date.now() - (timeoutMs - pausedRemainingRef.current);
      }
    };

    // Register event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Check inactivity every second
    timerRef.current = setInterval(() => {
      if (isLockedRef.current || isPausedRef.current) return;

      const storedHash = sessionStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) return; // No PIN set, skip locking

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        setIsLocked(true);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoginPage, timeoutMs, resetTimer]);

  // Countdown display: update remainingTime every second
  useEffect(() => {
    if (typeof window === "undefined" || isLoginPage) return;

    countdownRef.current = setInterval(() => {
      const storedHash = sessionStorage.getItem(PIN_HASH_KEY);
      if (!storedHash || isLockedRef.current) {
        setRemainingTime(-1);
        return;
      }

      if (isPausedRef.current) {
        setRemainingTime(pausedRemainingRef.current);
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeoutMs - elapsed);
      setRemainingTime(remaining);
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isLoginPage, timeoutMs]);

  return {
    isLocked: isLocked && !isLoginPage,
    unlock,
    lockNow,
    remainingTime,
    hasPinSet,
    setPin,
  };
}

export default useInactivityLock;
