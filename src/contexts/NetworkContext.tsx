"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getPendingCount } from "@/lib/offlineStorage";

interface NetworkContextType {
  isOnline: boolean;
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  pendingCount: 0,
  refreshPendingCount: async () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending count on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount]);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingCount, refreshPendingCount }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
