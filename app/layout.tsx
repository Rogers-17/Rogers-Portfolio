import type { Metadata, Viewport } from "next";
import localFonts from "next/font/local"
import "./globals.css";
import { DEFAULT_OG_IMAGE, SITE_URL, isIndexable, site } from "@/lib/site";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";

const atydisplay = localFonts({
  src:[
    {
      path: "../assets/fonts/AtypDisplay-Regular.woff",
      weight: "400",
      style: "normal"
    },
    {
      path: "../assets/fonts/AtypDisplay-Medium.woff2",
      weight: "500",
      style: "normal"
    },
    {
      path: "../assets/fonts/AtypDisplay-Semibold.woff2",
      weight: "600",
      style: "normal"
    },
  ],
  variable: "--font-atydisplay",
})

// Site-wide defaults. Each public page sets its own canonical (never here, or pages that
// forget one would inherit the homepage canonical) via pageMetadata() in lib/seo.ts.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: site.title, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  publisher: site.name,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: site.title,
    description: site.description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", creator: site.xHandle, title: site.title, description: site.description, images: [DEFAULT_OG_IMAGE.url] },
  // Only Vercel Production is indexable; previews and local builds are always noindex.
  robots: isIndexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${atydisplay.variable} h-full antialiased scroll-smooth [-webkit-tap-highlight-color:transparent]`}
    >
      <body className="flex min-h-screen flex-col bg-surface text-fg leading-[1.6]">
        {children}
        <SiteAnalytics />
        </body>
    </html>
  );
}
