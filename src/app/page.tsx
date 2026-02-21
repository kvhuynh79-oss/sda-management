import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "MySDAManager -- NDIS SDA Compliance & Property Management Software",
  description:
    "Still juggling spreadsheets, emails, and generic NDIS tools? MySDAManager replaces the workaround. One platform. Every SDA property. Audit-ready from day one.",
  openGraph: {
    title: "MySDAManager -- NDIS SDA Compliance & Property Management Software",
    description:
      "Australia's only purpose-built SDA management platform. Evidence vault, compliance alerts, Xero invoicing.",
    type: "website",
    url: "https://mysdamanager.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  keywords: [
    "SDA management software",
    "NDIS provider compliance tool",
    "SDA property management",
    "NDIS audit software",
    "SDA compliance Australia",
    "NDIS SDA provider",
    "disability housing software",
  ],
  alternates: {
    canonical: "https://mysdamanager.com",
  },
};

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <LandingPage />
    </Suspense>
  );
}
