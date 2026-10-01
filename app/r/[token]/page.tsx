import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import SharedResumeView from "@/components/resume/SharedResumeView"
import { hashIpFromHeaders } from "@/lib/project-request/rate-limit"
import { resolveShare } from "@/lib/resume/shares"
import { createAnonSupabase } from "@/lib/supabase/server"

// Public, login-free view of a shared resume (a frozen snapshot). Never indexed.

type Props = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
    title: "Shared resume",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
}

function Unavailable ({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-surface px-5 text-center">
            <div className="max-w-sm">
                <p className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-xl font-extrabold text-transparent uppercase">Rogers</p>
                <h1 className="mt-4 text-2xl font-bold">Link unavailable</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
                <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/12 px-6 text-sm font-semibold hover:border-accent-1">Visit the portfolio</Link>
            </div>
        </main>
    )
}

export default async function SharedResumePage ({ params }: Props) {
    const { token } = await params
    const result = await resolveShare(createAnonSupabase(), token, hashIpFromHeaders(await headers()))

    if (result === "rate_limited") return <Unavailable message="Too many requests from your network. Please try again in an hour." />
    if (!result) return <Unavailable message="This link has expired or been turned off. Ask the sender for a new one." />

    return <SharedResumeView resume={result} />
}
