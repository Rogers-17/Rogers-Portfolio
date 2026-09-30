"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuLoaderCircle, LuMail, LuPlus } from "react-icons/lu"
import { primaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { adminFetch } from "@/lib/admin/client"

type Item = { id: string, title: string, company: string | null, job_title: string | null, resumeTitle: string | null, updated_at: string }

export default function CoverLetterList ({ letters, defaultResumeId }: { letters: Item[], defaultResumeId: string | null }) {
    const router = useRouter()
    const { notify } = useToast()
    const [creating, setCreating] = React.useState(false)

    async function create () {
        setCreating(true)
        const result = await adminFetch<{ id: string }>("/api/admin/cover-letters", { json: { title: "New cover letter", resume_id: defaultResumeId, body: "", letter_date: new Date().toISOString().slice(0, 10) } })
        setCreating(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        router.push(`/admin/cover-letters/${result.data.id}`)
    }

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-dim uppercase"><span className="text-accent-1">03</span> / Career</p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">Cover letters</h1>
                    <p className="mt-1 text-sm text-muted">One per application, written from a linked resume.</p>
                </div>
                <button type="button" onClick={create} disabled={creating} className={primaryButtonClass}>
                    {creating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuPlus aria-hidden="true" />} New cover letter
                </button>
            </div>

            {letters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                    <p className="font-semibold">No cover letters yet</p>
                    <p className="mt-1 text-sm text-muted">Create one and let AI draft it from your resume and the job ad.</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {letters.map(letter => (
                        <li key={letter.id}>
                            <Link href={`/admin/cover-letters/${letter.id}`} className="flex min-w-0 items-center gap-4 rounded-2xl border border-white/6 bg-card p-4 transition-colors hover:border-accent-1/40">
                                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-1/10 text-accent-1"><LuMail aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold">{letter.title}</span>
                                    <span className="block truncate text-sm text-muted">{[letter.job_title, letter.company].filter(Boolean).join(" at ") || "No job set"}{letter.resumeTitle ? ` · ${letter.resumeTitle}` : ""}</span>
                                </span>
                                <time dateTime={letter.updated_at} suppressHydrationWarning className="hidden shrink-0 text-xs text-dim sm:block">{new Date(letter.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}
