import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BLOG_POSTS,
  getPostBySlug,
  getRelatedPosts,
  formatBlogDate,
} from "@/lib/blog";
import {
  generateBlogPostSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo";
import { ShareButton } from "@/components/marketing/ShareButton";

// ─── Static params for SSG ───────────────────────────────────────────
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

// ─── Dynamic metadata ────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | MySDAManager Blog`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: `https://mysdamanager.com/blog/${post.slug}`,
      siteName: "MySDAManager",
    },
  };
}

// ─── Category colour map ─────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "compliance-tips": "bg-blue-500/10 text-blue-400",
  "product-updates": "bg-teal-500/10 text-teal-400",
  "sda-market": "bg-purple-500/10 text-purple-400",
  "ndis-changes": "bg-amber-500/10 text-amber-400",
};

// ─── Page component ──────────────────────────────────────────────────
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);

  const blogPostSchema = generateBlogPostSchema({
    title: post.title,
    description: post.description,
    slug: post.slug,
    datePublished: post.date,
    authorName: post.author,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([blogPostSchema, breadcrumbSchema]),
        }}
      />

      <div className="py-12 sm:py-16 px-4">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to blog
          </Link>

          {/* Article header */}
          <header className="mb-10">
            {/* Category badge */}
            <span
              className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md mb-4 ${
                CATEGORY_COLORS[post.category] ||
                "bg-gray-700 text-gray-300"
              }`}
            >
              {post.categoryLabel}
            </span>

            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
              <span>{post.author}</span>
              <span aria-hidden="true" className="text-gray-600">
                |
              </span>
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <span aria-hidden="true" className="text-gray-600">
                |
              </span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          {/* Article content */}
          <article
            className="blog-content max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Share section */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Share this article
              </h2>
              <ShareButton slug={post.slug} title={post.title} />
            </div>
          </div>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <section
              className="mt-12 pt-8 border-t border-gray-700"
              aria-labelledby="related-heading"
            >
              <h2
                id="related-heading"
                className="text-xl font-semibold text-white mb-6"
              >
                Related articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="bg-gray-800 rounded-xl border border-gray-700 hover:border-teal-600/50 transition-colors p-5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${
                        CATEGORY_COLORS[related.category] ||
                        "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {related.categoryLabel}
                    </span>
                    <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors line-clamp-2 mb-2">
                      {related.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      <time dateTime={related.date}>
                        {formatBlogDate(related.date)}
                      </time>
                      {" "}&middot;{" "}
                      {related.readingTime}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA section */}
          <section className="mt-12 pt-8 border-t border-gray-700">
            <div className="bg-gradient-to-br from-teal-900/40 to-gray-800 rounded-xl border border-teal-600/30 p-8 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Ready to automate your SDA compliance?
              </h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Replace spreadsheets with purpose-built software. Properties,
                participants, compliance, and payments in one system.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/book-demo"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
