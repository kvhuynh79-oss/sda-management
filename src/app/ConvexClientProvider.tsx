"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { NetworkProvider } from "@/contexts/NetworkContext";
import InstallPrompt from "@/components/InstallPrompt";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set!');
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <NetworkProvider>
        {children}
        <InstallPrompt />
      </NetworkProvider>
    </ConvexProvider>
  );
}
