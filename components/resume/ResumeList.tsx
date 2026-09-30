"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuArchive, LuArchiveRestore, LuCopy, LuPencil, LuPlus, LuSettings2, LuTrash2 } from "react-icons/lu"
import { primaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { Thumb } from "@/components/resume/DesignForm"
import NewResumeDialog from "@/components/resume/NewResumeDialog"
import { adminFetch } from "@/lib/admin/client"
import { TEMPLATE_INFO, type ResumeRecord, type TemplateKey } from "@/lib/resume/schema"

type Card = Pick<ResumeRecord, "id" | "title" | "target_role" | "template" | "updated_at" | "is_archived" | "job_company"> & { accent: string }

const actionClass = "inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/6 hover:text-white lg:size-9"

export default function ResumeList ({ resumes, archived, defaultTemplate }: { resumes: Card[], archived: boolean, defaultTemplate: TemplateKey }) {
    const router = useRouter()
    const { notify } = useToast()
    const [creating, setCreating] = React.useState(false)
    const [busy, setBusy] = React.useState<string | null>(null)

    async function run (id: string, url: string, json: Record<string, unknown> | undefined, message: string) {
        setBusy(id)
        const result = await adminFetch<{ id: string }>(url, json ? { json } : { method: "POST" })
        setBusy(null)
        if (!result.ok) {
            notify(result.error.message, "error")
            return null
        }
        notify(message)
        router.refresh()
        return result.data
    }

    async function rename (resume: Card) {
        const title = window.prompt("Resume name", resume.title)?.trim()
        if (!title || title === resume.title) return
        await run(resume.id, `/api/admin/resumes/${resume.id}/rename`, { title, target_role: resume.target_role }, "Renamed.")
    }

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Resumes</h1>
                    <p className="mt-1 text-sm text-muted">One resume per job or field. Duplicate one to tailor it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/resume-settings" aria-label="Resume settings" title="AI model, daily limit and defaults" className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-muted hover:border-accent-1 hover:text-white">
                        <LuSettings2 aria-hidden="true" />
                    </Link>
                    <Link href={archived ? "/admin/resumes" : "/admin/resumes?archived=1"} className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm font-semibold text-muted hover:text-white">
                        {archived ? "Active resumes" : "Archived"}
                    </Link>
                    {!archived && (
                        <button type="button" onClick={() => setCreating(true)} className={primaryButtonClass}>
                            <LuPlus aria-hidden="true" /> New resume
                        </button>
                    )}
                </div>
            </div>

            {resumes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                    <p className="font-semibold">{archived ? "No archived resumes" : "No resumes yet"}</p>
                    {!archived && <p className="mt-1 text-sm text-muted">Create one from scratch or import your existing CV.</p>}
                    {!archived && <button type="button" onClick={() => setCreating(true)} className="mt-5 text-sm font-bold text-accent-1 hover:underline">Create your first resume →</button>}
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1500px]:grid-cols-4">
                    {resumes.map(resume => (
                        <li key={resume.id} className={`group flex flex-col overflow-hidden rounded-2xl border border-white/6 bg-card transition-colors hover:border-accent-1/40 ${busy === resume.id ? "opacity-60" : ""}`}>
                            <Link href={`/admin/resumes/${resume.id}`} className="block bg-[#0b0712] p-5">
                                <div className="mx-auto w-36 shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1">
                                    <Thumb template={resume.template} accent={resume.accent} />
                                </div>
                            </Link>
                            <div className="flex flex-1 flex-col gap-1 p-4">
                                <Link href={`/admin/resumes/${resume.id}`} className="truncate font-bold hover:text-accent-1">{resume.title}</Link>
                                <p className="truncate text-sm text-muted">{[resume.target_role, resume.job_company].filter(Boolean).join(" · ") || "No target role"}</p>
                                <p className="text-xs text-dim">
                                    {TEMPLATE_INFO[resume.template].label} · edited <time dateTime={resume.updated_at} suppressHydrationWarning>{new Date(resume.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>
                                </p>
                                <div className="mt-3 flex items-center gap-1 border-t border-white/6 pt-3">
                                    <button type="button" onClick={() => rename(resume)} aria-label={`Rename ${resume.title}`} title="Rename" className={actionClass}><LuPencil aria-hidden="true" /></button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const created = await run(resume.id, `/api/admin/resumes/${resume.id}/duplicate`, {}, "Duplicated.")
                                            if (created) router.push(`/admin/resumes/${created.id}`)
                                        }}
                                        aria-label={`Duplicate ${resume.title}`}
                                        title="Duplicate for another job"
                                        className={actionClass}
                                    >
                                        <LuCopy aria-hidden="true" />
                                    </button>
                                    <button type="button" onClick={() => run(resume.id, `/api/admin/resumes/${resume.id}/archive`, { archived: !archived }, archived ? "Restored." : "Archived.")} aria-label={archived ? `Restore ${resume.title}` : `Archive ${resume.title}`} title={archived ? "Restore" : "Archive"} className={actionClass}>
                                        {archived ? <LuArchiveRestore aria-hidden="true" /> : <LuArchive aria-hidden="true" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (window.confirm(`Delete "${resume.title}" permanently?`)) void run(resume.id, `/api/admin/resumes/${resume.id}/delete`, undefined, "Resume deleted.") }}
                                        aria-label={`Delete ${resume.title}`}
                                        title="Delete"
                                        className={`${actionClass} ml-auto hover:bg-rose-500/10 hover:text-rose-300`}
                                    >
                                        <LuTrash2 aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <NewResumeDialog key={String(creating)} open={creating} onClose={() => setCreating(false)} resumes={resumes.map(resume => ({ id: resume.id, title: resume.title }))} defaultTemplate={defaultTemplate} />
        </>
    )
}
