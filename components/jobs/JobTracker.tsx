"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuBellRing, LuColumns3, LuList, LuPlus, LuSearch, LuX } from "react-icons/lu"
import { inputClass, primaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import JobBoard from "@/components/jobs/JobBoard"
import JobEditor from "@/components/jobs/JobEditor"
import JobList from "@/components/jobs/JobList"
import { useNow } from "@/components/resume/useNow"
import { adminFetch } from "@/lib/admin/client"
import { JOB_STATUSES, JOB_STATUS_INFO, followUpState, type JobRecord, type JobStatus } from "@/lib/jobs/schema"

type Option = { id: string, title: string }

type Props = {
    initialJobs: JobRecord[]
    resumes: Option[]
    letters: Option[]
    serverToday: string
    resumeFilter: string | null
}

export default function JobTracker ({ initialJobs, resumes, letters, serverToday, resumeFilter }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const now = useNow()
    const today = now ? new Date(now).toISOString().slice(0, 10) : serverToday
    const [jobs, setJobs] = React.useState(initialJobs)
    const [view, setView] = React.useState<"board" | "list">("board")
    const [query, setQuery] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<JobStatus | "all">("all")
    const [editing, setEditing] = React.useState<{ job: JobRecord | null } | null>(null)
    const resumeTitles = React.useMemo(() => new Map(resumes.map(resume => [resume.id, resume.title])), [resumes])

    async function reload () {
        const result = await adminFetch<JobRecord[]>("/api/admin/jobs")
        if (result.ok) setJobs(result.data)
        router.refresh() // sidebar follow-up badge
    }

    async function move (id: string, status: JobStatus, ids: string[]) {
        const previous = jobs
        setJobs(current => current.map(job => {
            const order = ids.indexOf(job.id)
            if (job.id === id) return { ...job, status, sort_order: order, status_changed_at: job.status === status ? job.status_changed_at : new Date().toISOString() }
            return order >= 0 ? { ...job, sort_order: order } : job
        }))
        const result = await adminFetch("/api/admin/jobs/move", { json: { id, status, ids } })
        if (!result.ok) {
            setJobs(previous)
            notify(result.error.message, "error")
        } else {
            router.refresh()
        }
    }

    const search = query.trim().toLowerCase()
    const filtered = jobs.filter(job =>
        (!resumeFilter || job.resume_id === resumeFilter)
        && (statusFilter === "all" || job.status === statusFilter)
        && (!search || `${job.company} ${job.role} ${job.location ?? ""}`.toLowerCase().includes(search)))
    const due = jobs.filter(job => followUpState(job, today))
    const closeEditor = React.useCallback(() => setEditing(null), [])

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Job tracker</h1>
                    <p className="mt-1 text-sm text-muted">Every application, the resume you sent, and what&apos;s next.</p>
                </div>
                <button type="button" onClick={() => setEditing({ job: null })} className={primaryButtonClass}>
                    <LuPlus aria-hidden="true" /> New application
                </button>
            </div>

            {due.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-sm">
                    <span className="inline-flex items-center gap-2 font-semibold text-amber-100"><LuBellRing aria-hidden="true" /> Follow up:</span>
                    {due.map(job => (
                        <button key={job.id} type="button" onClick={() => setEditing({ job })} className={`rounded-full px-3 py-1 text-xs font-semibold ${followUpState(job, today) === "overdue" ? "bg-rose-500/20 text-rose-100" : "bg-amber-400/20 text-amber-50"} hover:brightness-125`}>
                            {job.company} · {job.role}
                        </button>
                    ))}
                </div>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="flex rounded-full border border-white/10 p-1" role="group" aria-label="View">
                    <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${view === "board" ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}><LuColumns3 aria-hidden="true" /> Board</button>
                    <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${view === "list" ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}><LuList aria-hidden="true" /> List</button>
                </div>
                <div className="relative min-w-48 flex-1 sm:max-w-xs">
                    <LuSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim" aria-hidden="true" />
                    <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search company or role" aria-label="Search applications" className={`${inputClass} pl-9`} />
                </div>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as JobStatus | "all")} aria-label="Filter by status" className={`${inputClass} w-auto [&>option]:bg-card`}>
                    <option value="all">All stages</option>
                    {JOB_STATUSES.map(status => <option key={status} value={status}>{JOB_STATUS_INFO[status].label}</option>)}
                </select>
                {resumeFilter && (
                    <Link href="/admin/jobs" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent-1/10 px-3 text-xs font-semibold text-accent-1">
                        Resume: {resumeTitles.get(resumeFilter) ?? "selected"} <LuX aria-label="Clear filter" />
                    </Link>
                )}
            </div>

            {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                    <p className="font-semibold">No applications yet</p>
                    <p className="mt-1 text-sm text-muted">Add the jobs you&apos;re interested in and track them from Saved to Offer.</p>
                    <button type="button" onClick={() => setEditing({ job: null })} className="mt-5 text-sm font-bold text-accent-1 hover:underline">Add your first application →</button>
                </div>
            ) : view === "board" ? (
                <JobBoard jobs={filtered} resumeTitles={resumeTitles} today={today} now={now} onOpen={job => setEditing({ job })} onMove={move} />
            ) : (
                <JobList jobs={filtered} resumeTitles={resumeTitles} today={today} onOpen={job => setEditing({ job })} />
            )}

            {editing && (
                <JobEditor
                    key={editing.job?.id ?? "new"}
                    job={editing.job}
                    defaultStatus={statusFilter === "all" ? "saved" : statusFilter}
                    resumes={resumes}
                    letters={letters}
                    onClose={closeEditor}
                    onSaved={reload}
                />
            )}
        </>
    )
}
