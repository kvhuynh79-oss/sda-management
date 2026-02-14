"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BLOG_CATEGORIES } from "@/lib/blog";

export function BlogCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  function handleCategoryChange(categoryId: string) {
    if (categoryId === "all") {
      router.push("/blog", { scroll: false });
    } else {
      router.push(`/blog?category=${categoryId}`, { scroll: false });
    }
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter blog posts by category"
    >
      {BLOG_CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              isActive
                ? "bg-teal-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
