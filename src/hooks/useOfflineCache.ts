"use client";

import { useEffect } from "react";
import { cacheData, getCachedData } from "@/lib/offlineStorage";

export function useOfflineCache<T>(key: string, data: T | undefined | null) {
  useEffect(() => {
    if (data) {
      cacheData(key, data);
    }
  }, [key, data]);
}

export async function getOfflineCachedData<T>(key: string): Promise<T | null> {
  return getCachedData<T>(key);
}
