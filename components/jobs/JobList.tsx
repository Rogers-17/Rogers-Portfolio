"use client"

import * as React from "react"
import { LuArrowDown, LuArrowUp } from "react-icons/lu"
import { JOB_STATUSES, JOB_STATUS_INFO, followUpState, type JobRecord } from "@/lib/jobs/schema"

type SortKey = "company" | "role" | "status" | "applied_on" | "follow_up_on"

const COLUMNS: { key: SortKey, label: string }[] = [
    { key: "company", label: "Company" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "applied_on", label: "Applied" },
    { key: "follow_up_on", label: "Follow up" },
]

function formatDate (value: string | null) {
    return value ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—"
}

export default function JobList ({ jobs, resumeTitles, today, onOpen }: { jobs: JobRecord[], resumeTitles: Map<string, string>, today: string, onOpen: (job: JobRecord) => void }) {
    const [sort, setSort] = React.useState<{ key: SortKey, asc: boolean }>({ key: "applied_on", asc: false })

    const sorted = [...jobs].sort((a, b) => {
        const value = (job: JobRecord) => (sort.key === "status" ? JOB_STATUSES.indexOf(job.status) : (job[sort.key] ?? "")) as string | number
        const left = value(a)
        const right = value(b)
        const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right))
        return sort.asc ? result : -result
    })

    if (jobs.length === 0) return <p className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-muted">No applications match.</p>

    return (
        <div className="overflow-x-auto rounded-2xl border border-white/6 bg-card">
            <table className="w-full min-w-160 text-left text-sm">
                <thead className="border-b border-white/6 text-[11px] tracking-wider text-muted uppercase">
                    <tr>
                        {COLUMNS.map(column => (
                            <th key={column.key} scope="col" className="px-4 py-3 font-semibold" aria-sort={sort.key === column.key ? (sort.asc ? "ascending" : "descending") : "none"}>
                                <button type="button" onClick={() => setSort(current => ({ key: column.key, asc: current.key === column.key ? !current.asc : true }))} className="inline-flex items-center gap-1 hover:text-white">
                                    {column.label}
                                    {sort.key === column.key && (sort.asc ? <LuArrowUp aria-hidden="true" /> : <LuArrowDown aria-hidden="true" />)}
                                </button>
                            </th>
                        ))}
                        <th scope="col" className="px-4 py-3 font-semibold">Resume</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(job => {
                        const info = JOB_STATUS_INFO[job.status]
                        const followUp = followUpState(job, today)
                        return (
                            <tr key={job.id} onClick={() => onOpen(job)} className="cursor-pointer border-b border-white/4 last:border-0 hover:bg-white/3">
                                <td className="px-4 py-3 font-semibold">
                                    <button type="button" onClick={event => { event.stopPropagation(); onOpen(job) }} className="text-left hover:text-accent-1">{job.company}</button>
                                </td>
                                <td className="px-4 py-3 text-muted">{job.role}</td>
                                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 ${info.text}`}><span className={`size-1.5 rounded-full ${info.dot}`} aria-hidden="true" />{info.label}</span></td>
                                <td className="px-4 py-3 text-muted">{formatDate(job.applied_on)}</td>
                                <td className={`px-4 py-3 ${followUp === "overdue" ? "text-rose-300" : followUp === "today" ? "text-amber-200" : "text-muted"}`}>{formatDate(job.follow_up_on)}</td>
                                <td className="max-w-48 truncate px-4 py-3 text-muted">{job.resume_id ? resumeTitles.get(job.resume_id) ?? "—" : "—"}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
