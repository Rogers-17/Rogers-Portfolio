import type { MetadataRoute } from "next"
import { SITE_HOST, absoluteUrl, isIndexable } from "@/lib/site"

// robots.txt is a crawling hint, not access control: admin data stays protected by auth + RLS.
// /r/ and /d/ (share links) are deliberately NOT disallowed: crawlers must fetch them to see
// their noindex, otherwise a link posted on a public CV could be indexed without content.
export default function robots (): MetadataRoute.Robots {
    if (!isIndexable) {
        // Previews and local builds: keep everything out of search.
        return { rules: { userAgent: "*", disallow: "/" } }
    }

    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
        sitemap: absoluteUrl("/sitemap.xml"),
        host: SITE_HOST,
    }
}
