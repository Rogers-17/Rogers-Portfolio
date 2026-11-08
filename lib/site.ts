import { z } from "zod"

// Single source of truth for the public site's identity and canonical origin.
// Client-safe: only NEXT_PUBLIC_* / build-time values are read here.

export const DEFAULT_SITE_URL = "https://mohammednrogers.online"

// Must match NEXT_PUBLIC_SITE_URL in Vercel Production. Leave it unset in Preview so
// preview share links keep their own origin (canonicals still point to production).
const siteUrlSchema = z.url({ protocol: /^https?$/ }).transform(value => value.replace(/\/+$/, ""))

function resolveSiteUrl (): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    if (!raw) return DEFAULT_SITE_URL
    const parsed = siteUrlSchema.safeParse(raw)
    // Fail the build loudly rather than publishing canonicals to a wrong origin.
    if (!parsed.success) throw new Error(`NEXT_PUBLIC_SITE_URL is not a valid http(s) URL: "${raw}"`)
    return parsed.data
}

export const SITE_URL = resolveSiteUrl()
export const SITE_HOST = new URL(SITE_URL).host

// Only the Vercel Production deployment may be indexed. No NODE_ENV fallback: previews,
// local builds and any other environment are always noindex.
export const isIndexable = process.env.VERCEL_ENV === "production"

export function absoluteUrl (path = "/"): string {
    return new URL(path, `${SITE_URL}/`).toString()
}

export const site = {
    name: "Mohammed N. Rogers",
    alternateName: "Rogers",
    jobTitle: "Full-Stack Software Engineer",
    title: "Mohammed N. Rogers | Full-Stack Software Engineer",
    description: "Explore the portfolio of Mohammed N. Rogers, a software engineer based in Liberia specializing in full-stack web development, Next.js, React, TypeScript, Node.js, and scalable digital solutions.",
    locale: "en_US",
    language: "en",
    countryCode: "LR",
    city: "Monrovia",
    themeColor: "#05000a",
    knowsAbout: ["Next.js", "React", "TypeScript", "Node.js", "Supabase"],
    // Verified public profiles only (footer icons + Person sameAs).
    socials: [
        { name: "GitHub", href: "https://github.com/Rogers-17" },
        { name: "LinkedIn", href: "https://www.linkedin.com/in/mohammed-rogers-791589388" },
        { name: "X", href: "https://x.com/Ayosavage361142" },
    ],
    xHandle: "@Ayosavage361142",
} as const

export const DEFAULT_OG_IMAGE = { url: "/og", width: 1200, height: 630, alt: `${site.name}, ${site.jobTitle}` }
