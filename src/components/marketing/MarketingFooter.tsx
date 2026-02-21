import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

const TRUST_BADGES = [
  {
    label: "AES-256 Encrypted",
    icon: (
      <svg
        className="h-5 w-5 text-teal-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
  {
    label: "NDIS-Compliant Data Protection",
    icon: (
      <svg
        className="h-5 w-5 text-teal-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    label: "NDIS Aligned",
    icon: (
      <svg
        className="h-5 w-5 text-teal-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust badges */}
        <div className="border-b border-gray-800 py-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2">
                {badge.icon}
                <span className="text-sm font-medium text-gray-300">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer columns */}
        <div className="py-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3" role="list">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Connect column */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
              Connect
            </h3>
            <ul className="mt-4 space-y-3" role="list">
              <li>
                <a
                  href="mailto:hello@mysdamanager.com"
                  className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
                >
                  hello@mysdamanager.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MySDAManager. All rights reserved.
          </p>
          <p className="text-sm text-gray-400">
            Built for NDIS compliance
          </p>
        </div>
      </div>
    </footer>
  );
}
