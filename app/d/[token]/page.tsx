import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import LinkUnavailable from "@/components/share/LinkUnavailable"
import { resolveDocumentShare } from "@/lib/documents/shares"
import { hashIpFromHeaders } from "@/lib/project-request/rate-limit"

// Public, login-free share link for a private document. A valid link redirects to a 60-second
// download URL; invalid, expired and deleted links all look the same. Never indexed.

type Props = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
    title: "Shared document",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
}

export default async function SharedDocumentPage ({ params }: Props) {
    const { token } = await params
    const result = await resolveDocumentShare(token, hashIpFromHeaders(await headers()))

    if (result === "rate_limited") return <LinkUnavailable message="Too many requests from your network. Please try again in an hour." />
    if (!result) return <LinkUnavailable message="This link has expired or been turned off. Ask the sender for a new one." />

    redirect(result)
}
