// JSON-LD structured data generators for MySDAManager SEO
// Reference: https://schema.org

const SITE_URL = "https://mysdamanager.com";
const SITE_NAME = "MySDAManager";
const CONTACT_EMAIL = "hello@mysdamanager.com";

interface FAQItem {
  question: string;
  answer: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BlogPostData {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  image?: string;
}

/**
 * Organization schema for the root layout.
 * Tells search engines about MySDAManager as a business entity.
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/mysda-logo-dark.svg`,
    description:
      "Australia's purpose-built SDA management platform. Evidence vault, compliance alerts, Xero invoicing. Audit-ready from day one.",
    email: CONTACT_EMAIL,
    foundingDate: "2026",
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      contactType: "sales",
      availableLanguage: "English",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
    },
  };
}

/**
 * SoftwareApplication schema for the landing page.
 * Provides rich snippet data about the product and pricing.
 */
export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "NDIS SDA compliance and property management software for Australian disability accommodation providers.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "AUD",
      lowPrice: "499",
      highPrice: "1499",
      offerCount: "3",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "499",
          priceCurrency: "AUD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "499",
            priceCurrency: "AUD",
            billingDuration: "P1M",
          },
          description:
            "For emerging SDA providers managing up to 10 properties.",
        },
        {
          "@type": "Offer",
          name: "Professional",
          price: "899",
          priceCurrency: "AUD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "899",
            priceCurrency: "AUD",
            billingDuration: "P1M",
          },
          description:
            "For growing providers managing up to 25 properties with advanced compliance features.",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "1499",
          priceCurrency: "AUD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "1499",
            priceCurrency: "AUD",
            billingDuration: "P1M",
          },
          description:
            "For large providers with up to 50 properties, unlimited users, API access, and white-label branding.",
        },
      ],
    },
    featureList: [
      "SDA property management",
      "NDIS participant records",
      "Maintenance request tracking",
      "Compliance certification management",
      "Incident reporting and resolution",
      "Xero accounting integration",
      "Document evidence vault",
      "Automated compliance alerts",
      "Audit-ready export packs",
      "Mobile PWA with offline support",
    ],
    screenshot: `${SITE_URL}/og-image.png`,
    softwareVersion: "2.4.0",
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/**
 * FAQ page schema for the FAQ page.
 * Enables FAQ rich snippets in search results.
 */
export function generateFAQPageSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Breadcrumb schema for structured navigation.
 * Helps search engines understand page hierarchy.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Blog post schema for individual blog articles.
 * Enables article rich snippets in search results.
 */
export function generateBlogPostSchema(post: BlogPostData) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/mysda-logo-dark.svg`,
      },
    },
    image: post.image ?? `${SITE_URL}/og-image.png`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
  };
}
