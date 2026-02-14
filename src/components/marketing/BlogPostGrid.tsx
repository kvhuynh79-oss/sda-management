"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPostsByCategory, formatBlogDate } from "@/lib/blog";

const CATEGORY_COLORS: Record<string, string> = {
  "compliance-tips": "bg-blue-500/10 text-blue-400",
  "product-updates": "bg-teal-500/10 text-teal-400",
  "sda-market": "bg-purple-500/10 text-purple-400",
  "ndis-changes": "bg-amber-500/10 text-amber-400",
};

export function BlogPostGrid() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const posts = getPostsByCategory(activeCategory);

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">
          No posts found in this category.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      role="tabpanel"
      aria-label="Blog posts"
    >
      {posts.map((post) => (
        <article
          key={post.slug}
          className="bg-gray-800 rounded-xl border border-gray-700 hover:border-teal-600/50 transition-colors overflow-hidden flex flex-col"
        >
          <div className="p-6 flex flex-col flex-1">
            {/* Category badge */}
            <span
              className={`inline-block self-start px-2.5 py-1 text-xs font-medium rounded-md mb-3 ${
                CATEGORY_COLORS[post.category] ||
                "bg-gray-700 text-gray-300"
              }`}
            >
              {post.categoryLabel}
            </span>

            {/* Title */}
            <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
              >
                {post.title}
              </Link>
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4 line-clamp-3 flex-1">
              {post.description}
            </p>

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-700">
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <span>{post.readingTime}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
