"use client"

import { LuBellRing, LuFileText, LuStar } from "react-icons/lu"
import { daysSince, followUpState, type JobRecord } from "@/lib/jobs/schema"

type Props = {
    job: JobRecord
    resumeTitle: string | null
    today: string
    now: number
    dragging?: boolean
    onOpen?: () => void
}

export default function JobCard ({ job, resumeTitle, today, now, dragging, onOpen }: Props) {
    const followUp = followUpState(job, today)
    const days = now ? daysSince(job.status_changed_at, now) : null

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={event => { if (event.key === "Enter") onOpen?.() }}
            className={`cursor-pointer rounded-xl border bg-white/3 p-3 text-left transition-[border-color,transform,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${dragging ? "rotate-1 border-accent-1/60 shadow-2xl" : "border-white/8 hover:-translate-y-0.5 hover:border-white/20"}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold">{job.company}</p>
                {job.priority > 0 && (
                    <span className="flex shrink-0 text-amber-300" aria-label={`Priority ${job.priority} of 3`}>
                        {Array.from({ length: job.priority }, (_, index) => <LuStar key={index} className="size-3 fill-current" aria-hidden="true" />)}
                    </span>
                )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">{job.role}{job.location ? ` · ${job.location}` : ""}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                {resumeTitle && <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-white/6 px-1.5 py-0.5 text-muted"><LuFileText className="shrink-0" aria-hidden="true" /> {resumeTitle}</span>}
                {followUp && (
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${followUp === "overdue" ? "bg-rose-500/15 text-rose-200" : "bg-amber-400/15 text-amber-100"}`}>
                        <LuBellRing aria-hidden="true" /> {followUp === "overdue" ? "Follow-up overdue" : "Follow up today"}
                    </span>
                )}
                {days !== null && <span className="ml-auto text-dim">{days === 0 ? "today" : `${days}d in stage`}</span>}
            </div>
        </div>
    )
}
