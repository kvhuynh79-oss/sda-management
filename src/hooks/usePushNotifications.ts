"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Push Notification Hook
 *
 * Manages the lifecycle of Web Push subscriptions for the current user.
 * Handles browser permission requests, service worker registration,
 * PushManager subscription, and Convex backend synchronization.
 *
 * Requirements:
 * - A registered service worker at /sw.js that handles push events
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable set
 * - pushSubscriptions table in Convex schema
 *
 * iOS Safari Notes:
 * - Web Push is supported on iOS 16.4+ (Safari only, must be added to Home Screen)
 * - Permission must be requested from a user gesture (button click)
 * - The app must be running as a PWA (added to Home Screen) on iOS
 */

interface UsePushNotificationsReturn {
  /** Whether the browser supports the Push API */
  isSupported: boolean;
  /** Whether the current device has an active push subscription */
  isSubscribed: boolean;
  /** Whether an operation (subscribe/unsubscribe) is in progress */
  isLoading: boolean;
  /** Current Notification permission state */
  permission: NotificationPermission | "unsupported";
  /** Subscribe the current device for push notifications */
  subscribe: () => Promise<{ success: boolean; error?: string }>;
  /** Unsubscribe the current device from push notifications */
  unsubscribe: () => Promise<{ success: boolean; error?: string }>;
  /** Error message if the last operation failed */
  error: string | null;
  /** Number of devices this user has subscribed */
  deviceCount: number;
}

/**
 * Convert a base64 URL-safe string to a Uint8Array.
 * Required for the applicationServerKey parameter of PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the Push API is available in the current browser environment.
 */
function checkPushSupport(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  return true;
}

export function usePushNotifications(
  userId: Id<"users"> | null | undefined
): UsePushNotificationsReturn {
  const [isSupported] = useState<boolean>(() => checkPushSupport());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return Notification.permission;
    }
  );
  const [error, setError] = useState<string | null>(null);

  // Track the current endpoint to detect subscription changes
  const currentEndpointRef = useRef<string | null>(null);

  // Convex mutations for subscription management
  const subscribeMutation = useMutation(api.pushSubscriptions.subscribe);
  const unsubscribeMutation = useMutation(api.pushSubscriptions.unsubscribe);

  // Query existing subscriptions for this user
  const existingSubscriptions = useQuery(
    api.pushSubscriptions.getByUser,
    userId ? { userId } : "skip"
  );

  const deviceCount = existingSubscriptions?.length ?? 0;

  /**
   * Check the current subscription state on mount and when the service worker changes.
   */
  useEffect(() => {
    if (!isSupported || !userId) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          currentEndpointRef.current = subscription.endpoint;
          setIsSubscribed(true);
        } else {
          currentEndpointRef.current = null;
          setIsSubscribed(false);
        }
      } catch (err) {
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported, userId]);

  /**
   * Update permission state when the component is focused (user may have
   * changed permission in browser settings).
   */
  useEffect(() => {
    if (!isSupported) return;

    const handleFocus = () => {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isSupported]);

  /**
   * Subscribe the current device for push notifications.
   *
   * Flow:
   * 1. Request Notification permission from the browser
   * 2. Get or register the service worker
   * 3. Create a PushSubscription via PushManager.subscribe()
   * 4. Send the subscription details to the Convex backend
   */
  const subscribe = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!isSupported) {
      return {
        success: false,
        error: "Push notifications are not supported in this browser.",
      };
    }

    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return {
        success: false,
        error: "Push notification configuration is missing. Contact your administrator.",
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        const msg =
          permissionResult === "denied"
            ? "Notification permission was denied. Please enable notifications in your browser settings."
            : "Notification permission was dismissed. Please try again.";
        setError(msg);
        return { success: false, error: msg };
      }

      // Step 2: Get the service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Step 3: Subscribe via PushManager
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required by Chrome - all push must show a notification
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract subscription keys
      const subscriptionJson = pushSubscription.toJSON();
      const endpoint = subscriptionJson.endpoint;
      const keyP256dh = subscriptionJson.keys?.p256dh;
      const keyAuth = subscriptionJson.keys?.auth;

      if (!endpoint || !keyP256dh || !keyAuth) {
        throw new Error("Push subscription is missing required keys.");
      }

      // Step 4: Save to Convex backend
      await subscribeMutation({
        userId,
        endpoint,
        keyP256dh,
        keyAuth,
        userAgent: navigator.userAgent,
      });

      currentEndpointRef.current = endpoint;
      setIsSubscribed(true);
      setError(null);

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to subscribe for push notifications.";

      // Provide user-friendly messages for common errors
      let friendlyMessage = errorMessage;
      if (errorMessage.includes("Registration failed")) {
        friendlyMessage =
          "Service worker registration failed. Please reload the page and try again.";
      } else if (errorMessage.includes("AbortError")) {
        friendlyMessage =
          "Push subscription was blocked. This may be a browser or network issue.";
      }

      setError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId, subscribeMutation]);

  /**
   * Unsubscribe the current device from push notifications.
   *
   * Flow:
   * 1. Get the current PushSubscription from the service worker
   * 2. Call PushSubscription.unsubscribe() to remove it from the browser
   * 3. Remove the subscription record from the Convex backend
   */
  const unsubscribe = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get the current push subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Step 2: Unsubscribe from the browser
        await subscription.unsubscribe();

        // Step 3: Remove from Convex backend
        await unsubscribeMutation({
          userId,
          endpoint,
        });
      } else if (currentEndpointRef.current) {
        // No browser subscription but we have a stored endpoint - clean up backend
        await unsubscribeMutation({
          userId,
          endpoint: currentEndpointRef.current,
        });
      }

      currentEndpointRef.current = null;
      setIsSubscribed(false);
      setError(null);

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to unsubscribe from push notifications.";

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, unsubscribeMutation]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    error,
    deviceCount,
  };
}
