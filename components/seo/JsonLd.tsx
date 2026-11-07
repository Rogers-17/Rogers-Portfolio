import { serializeJsonLd } from "@/lib/seo"

// Renders one or more schema.org nodes as a single @graph. Data must be public, published content.
export default function JsonLd ({ nodes }: { nodes: Record<string, unknown>[] }) {
    const json = serializeJsonLd({ "@context": "https://schema.org", "@graph": nodes })
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
