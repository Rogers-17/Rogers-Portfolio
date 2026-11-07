import type { Metadata } from "next"
import { headers } from "next/headers"
import SharedResumeView from "@/components/resume/SharedResumeView"
import LinkUnavailable from "@/components/share/LinkUnavailable"
import { hashIpFromHeaders } from "@/lib/project-request/rate-limit"
import { resolveShare } from "@/lib/resume/shares"
import { createAnonSupabase } from "@/lib/supabase/server"

// Public, login-free view of a shared resume (a frozen snapshot). Never indexed.

type Props = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
    title: { absolute: "Shared resume" },
    // Opt out of the site-wide description / social card from app/layout.tsx so link previews stay generic.
    description: null,
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
}

export default async function SharedResumePage ({ params }: Props) {
    const { token } = await params
    const result = await resolveShare(createAnonSupabase(), token, hashIpFromHeaders(await headers()))

    if (result === "rate_limited") return <LinkUnavailable message="Too many requests from your network. Please try again in an hour." />
    if (!result) return <LinkUnavailable message="This link has expired or been turned off. Ask the sender for a new one." />

    return <SharedResumeView resume={result} />
}
