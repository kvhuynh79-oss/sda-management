import Script from "next/script";

export const metadata = {
  title: "MySDAManager - Outlook Add-in",
};

export default function OutlookAddinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-gray-900 text-white m-0 p-0">{children}</body>
    </html>
  );
}
