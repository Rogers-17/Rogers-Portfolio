import type { Metadata } from "next"
import { headers } from "next/headers"
import SharedDocumentView from "@/components/documents/SharedDocumentView"
import LinkUnavailable from "@/components/share/LinkUnavailable"
import { resolveDocumentShare } from "@/lib/documents/shares"
import { hashIpFromHeaders } from "@/lib/project-request/rate-limit"

// Public, login-free page for a shared document: it shows the file, and downloading is an
// optional button (./download). Invalid, expired and deleted links all look the same. The
// title stays generic so chat-app link previews don't reveal the document. Never indexed.

type Props = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
    title: "Shared document",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
}

export default async function SharedDocumentPage ({ params }: Props) {
    const { token } = await params
    const result = await resolveDocumentShare(token, hashIpFromHeaders(await headers()), "view")

    if (result === "rate_limited") return <LinkUnavailable message="Too many requests from your network. Please try again in an hour." />
    if (!result) return <LinkUnavailable message="This link has expired or been turned off. Ask the sender for a new one." />

    return (
        <SharedDocumentView
            title={result.title}
            fileName={result.fileName}
            format={result.format}
            size={result.size}
            url={result.url}
            downloadHref={`/d/${token.toLowerCase()}/download`}
        />
    )
}
