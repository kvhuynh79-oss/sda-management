import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import CommandPalette from "@/components/CommandPalette";
import SupportButton from "@/components/SupportButton";
import { generateOrganizationSchema } from "@/lib/seo";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "MySDAManager -- NDIS SDA Compliance & Property Management Software",
    template: "%s | MySDAManager",
  },
  description:
    "Australia's purpose-built SDA management platform. Evidence vault, compliance alerts, Xero invoicing. Audit-ready from day one.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://mysdamanager.com"),
  openGraph: {
    siteName: "MySDAManager",
    locale: "en_AU",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  keywords: [
    "SDA management software",
    "NDIS provider compliance tool",
    "SDA participant record keeping",
    "NDIS audit software",
    "SDA property management Australia",
  ],
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MySDAManager",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:p-2 focus:rounded focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ConvexClientProvider>
          <OrganizationProvider>
            <ThemeProvider>
              <ToastProvider>
                <ConfirmDialogProvider>
                  <CommandPalette />
                  <div id="main-content">
                    {children}
                  </div>
                  <SupportButton />
                </ConfirmDialogProvider>
              </ToastProvider>
            </ThemeProvider>
          </OrganizationProvider>
        </ConvexClientProvider>
        {/* Tawk.to Live Chat - only loads when property ID is configured */}
        {process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID && (
          <Script
            id="tawk-to"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                (function(){
                  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                  s1.async=true;
                  s1.src='https://embed.tawk.to/${process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID}/default';
                  s1.charset='UTF-8';
                  s1.setAttribute('crossorigin','*');
                  s0.parentNode.insertBefore(s1,s0);
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
