import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogCategoryFilter } from "@/components/marketing/BlogCategoryFilter";
import { BlogPostGrid } from "@/components/marketing/BlogPostGrid";
import {
  generateBreadcrumbSchema,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog — SDA Compliance Tips, Market Insights & Product Updates | MySDAManager",
  description:
    "Expert insights on SDA compliance, NDIS regulatory changes, and property management best practices for Australian disability housing providers.",
  keywords: [
    "SDA blog",
    "NDIS compliance blog",
    "SDA property management tips",
    "NDIS audit preparation",
    "specialist disability accommodation insights",
  ],
  openGraph: {
    title: "Blog — SDA Compliance Tips, Market Insights & Product Updates",
    description:
      "Expert insights on SDA compliance, NDIS regulatory changes, and property management best practices for Australian disability housing providers.",
    url: "https://mysdamanager.com/blog",
    siteName: "MySDAManager",
    type: "website",
  },
};

export default function BlogPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <div className="py-16 sm:py-20 px-4">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Blog
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              Compliance tips, market insights, and product updates for SDA
              providers.
            </p>
          </div>

          {/* Category filter tabs */}
          <div className="mb-8">
            <Suspense
              fallback={
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 w-28 rounded-lg bg-gray-800 animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <BlogCategoryFilter />
            </Suspense>
          </div>

          {/* Post grid */}
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-800 rounded-xl border border-gray-700 h-72 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <BlogPostGrid />
          </Suspense>
        </div>
      </div>
    </>
  );
}
