import type { NextConfig } from "next";

// Allow next/image to load only public Supabase Storage objects from this project.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// Same rule as lib/site.ts: only Vercel Production may be indexed.
const isIndexable = process.env.VERCEL_ENV === "production";
const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // Defense in depth alongside <meta name="robots">. Also covers non-HTML responses (API
  // JSON, shared-file downloads). Indexing hints only: access is enforced by auth + RLS.
  async headers () {
    if (!isIndexable) return [{ source: "/:path*", headers: [NOINDEX] }];
    return ["/admin/:path*", "/admin", "/api/:path*", "/r/:path*", "/d/:path*"].map(source => ({ source, headers: [NOINDEX] }));
  },
};

export default nextConfig;
