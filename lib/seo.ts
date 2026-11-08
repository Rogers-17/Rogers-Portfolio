import type { Metadata } from "next"
import { DEFAULT_OG_IMAGE, SITE_URL, absoluteUrl, site } from "@/lib/site"

// Metadata is merged shallowly per segment, so a page's openGraph/twitter would otherwise
// drop the root's siteName, locale and image. pageMetadata() always emits the full block.

type OgImage = { url: string, alt?: string, width?: number, height?: number }

type PageMetaInput = {
    title: string | { absolute: string }
    description: string
    path: string
    // Absolute canonical (e.g. a post first published elsewhere). Defaults to `path`.
    canonical?: string
    image?: OgImage | null
    type?: "website" | "article"
    article?: { publishedTime: string, modifiedTime: string }
    robots?: Metadata["robots"]
}

export function pageMetadata (input: PageMetaInput): Metadata {
    const socialTitle = typeof input.title === "string" ? input.title : input.title.absolute
    const images = [input.image ?? DEFAULT_OG_IMAGE]

    return {
        title: input.title,
        description: input.description,
        alternates: { canonical: input.canonical ?? input.path },
        openGraph: {
            type: input.type ?? "website",
            url: input.path,
            siteName: site.name,
            locale: site.locale,
            title: socialTitle,
            description: input.description,
            images,
            ...(input.type === "article" && input.article
                ? { publishedTime: input.article.publishedTime, modifiedTime: input.article.modifiedTime, authors: [absoluteUrl("/about")] }
                : {}),
        },
        twitter: {
            card: "summary_large_image",
            creator: site.xHandle,
            title: socialTitle,
            description: input.description,
            images: images.map(image => image.url),
        },
        ...(input.robots ? { robots: input.robots } : {}),
    }
}

// ---------------------------------------------------------------------------
// Canonical URLs entered in the dashboard
// ---------------------------------------------------------------------------

// Returns a normalized http(s) URL, or null when the value isn't safe to emit as a canonical.
export function safeCanonical (value: string | null | undefined): string | null {
    if (!value || value.length > 300) return null
    let url: URL
    try {
        url = new URL(value.trim())
    } catch {
        return null
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    if (url.username || url.password) return null
    if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null
    return url.toString()
}

// ---------------------------------------------------------------------------
// JSON-LD (schema.org)
// ---------------------------------------------------------------------------

export const PERSON_ID = `${SITE_URL}/#person`
export const WEBSITE_ID = `${SITE_URL}/#website`

const personRef = { "@id": PERSON_ID }

export function personJsonLd (imageUrl?: string) {
    return {
        "@type": "Person",
        "@id": PERSON_ID,
        name: site.name,
        alternateName: site.alternateName,
        url: absoluteUrl("/"),
        jobTitle: site.jobTitle,
        ...(imageUrl ? { image: imageUrl } : {}),
        address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: site.countryCode },
        knowsAbout: [...site.knowsAbout],
        sameAs: site.socials.map(social => social.href),
    }
}

export function websiteJsonLd () {
    return {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: site.name,
        url: absoluteUrl("/"),
        description: site.description,
        inLanguage: site.language,
        publisher: personRef,
    }
}

export function profilePageJsonLd (input: { path: string, name: string, description: string, imageUrl?: string }) {
    return {
        "@type": "ProfilePage",
        url: absoluteUrl(input.path),
        name: input.name,
        description: input.description,
        inLanguage: site.language,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: personJsonLd(input.imageUrl),
    }
}

export function breadcrumbJsonLd (items: { name: string, path: string }[]) {
    return {
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    }
}

export function blogPostingJsonLd (post: {
    path: string, title: string, description: string, publishedAt: string, modifiedAt: string, imageUrl: string | null,
}) {
    const url = absoluteUrl(post.path)
    const author = { "@type": "Person", "@id": PERSON_ID, name: site.name, url: absoluteUrl("/about") }
    return {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt,
        inLanguage: site.language,
        image: post.imageUrl ?? absoluteUrl(DEFAULT_OG_IMAGE.url),
        author,
        publisher: author,
        isPartOf: { "@id": WEBSITE_ID },
    }
}

export function creativeWorkJsonLd (project: {
    path: string, name: string, description: string, year: number, imageUrl: string | null, keywords: string[], websiteUrl: string | null,
}) {
    return {
        "@type": "CreativeWork",
        name: project.name,
        description: project.description,
        url: absoluteUrl(project.path),
        dateCreated: String(project.year),
        inLanguage: site.language,
        creator: { "@type": "Person", "@id": PERSON_ID, name: site.name, url: absoluteUrl("/about") },
        ...(project.imageUrl ? { image: project.imageUrl } : {}),
        ...(project.keywords.length ? { keywords: project.keywords.join(", ") } : {}),
        ...(project.websiteUrl ? { sameAs: project.websiteUrl } : {}),
    }
}

// Serializes JSON-LD for a <script> tag. JSON.stringify alone is not safe inside HTML:
// "</script>" or "<!--" in data would break out, so HTML-sensitive characters and the JS
// line separators are escaped as \uXXXX (still valid JSON with identical values).
// Built from char codes so the source stays ASCII (a raw U+2028 is a JS line break).
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g")
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g")

export function serializeJsonLd (data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(LINE_SEPARATOR, "\\u2028")
        .replace(PARAGRAPH_SEPARATOR, "\\u2029")
}
