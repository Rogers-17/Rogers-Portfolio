"use client"

import Link from "next/link"
import { PdfViewer } from "@/components/resume/PdfPreview"
import type { SharedResume } from "@/lib/resume/shares"

// The public share page: a slim branded bar and the resume PDF, rendered in the browser.
export default function SharedResumeView ({ resume }: { resume: SharedResume }) {
    const name = resume.data.contact.fullName || resume.title
    return (
        <main className="flex h-dvh flex-col bg-surface">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 bg-card px-4 py-3 md:px-6">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold md:text-base">{name}</p>
                    <p className="text-xs text-muted">Shared resume{resume.data.contact.headline ? ` · ${resume.data.contact.headline}` : ""}</p>
                </div>
                <Link href="/" className="text-xs text-dim hover:text-white">
                    Powered by <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text font-bold text-transparent uppercase">Rogers</span>
                </Link>
            </header>
            <div className="min-h-0 flex-1 p-2 md:p-4">
                <PdfViewer
                    documentKey="shared"
                    allowDownload={resume.allowDownload}
                    filename={`${name} - Resume`}
                    className="h-full"
                    build={async () => {
                        const { default: ResumeDocument } = await import("@/components/resume/pdf/ResumeDocument")
                        return <ResumeDocument template={resume.template} design={resume.design} data={resume.data} photoUrl={resume.design.showPhoto ? resume.photoData : null} title={`${name} - Resume`} />
                    }}
                />
            </div>
        </main>
    )
}
