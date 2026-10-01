"use client"

import * as React from "react"
import {
    DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
    type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import JobCard from "@/components/jobs/JobCard"
import { JOB_STATUSES, JOB_STATUS_INFO, type JobRecord, type JobStatus } from "@/lib/jobs/schema"

type Columns = Record<JobStatus, string[]>

type Props = {
    jobs: JobRecord[]
    resumeTitles: Map<string, string>
    today: string
    now: number
    onOpen: (job: JobRecord) => void
    onMove: (id: string, status: JobStatus, ids: string[]) => void
}

function toColumns (jobs: JobRecord[]): Columns {
    const columns = Object.fromEntries(JOB_STATUSES.map(status => [status, [] as string[]])) as Columns
    for (const job of [...jobs].sort((a, b) => a.sort_order - b.sort_order)) columns[job.status].push(job.id)
    return columns
}

function SortableCard ({ job, children }: { job: JobRecord, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "opacity-30" : ""} {...attributes} {...listeners} aria-roledescription="Draggable application">
            {children}
        </div>
    )
}

function Column ({ status, count, children }: { status: JobStatus, count: number, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    const info = JOB_STATUS_INFO[status]
    return (
        <section aria-label={`${info.label} (${count})`} className={`flex w-72 shrink-0 snap-start flex-col rounded-2xl border border-t-2 border-white/6 bg-card/60 min-[1440px]:w-auto min-[1440px]:min-w-0 min-[1440px]:flex-1 ${info.border} ${isOver ? "ring-1 ring-accent-1/40" : ""}`}>
            <header className="flex items-center justify-between px-3 pt-3 pb-2">
                <h2 className="flex items-center gap-2 text-sm font-bold"><span className={`size-2 rounded-full ${info.dot}`} aria-hidden="true" />{info.label}</h2>
                <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-muted">{count}</span>
            </header>
            <div ref={setNodeRef} className="flex min-h-32 flex-1 flex-col gap-2 p-2">{children}</div>
        </section>
    )
}

export default function JobBoard ({ jobs, resumeTitles, today, now, onOpen, onMove }: Props) {
    const [columns, setColumns] = React.useState(() => toColumns(jobs))
    const [lastJobs, setLastJobs] = React.useState(jobs)
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const byId = React.useMemo(() => new Map(jobs.map(job => [job.id, job])), [jobs])

    // Re-sync when the parent list changes (adjusting state during render).
    if (jobs !== lastJobs) {
        setLastJobs(jobs)
        setColumns(toColumns(jobs))
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const containerOf = (id: string): JobStatus | null => {
        if ((JOB_STATUSES as readonly string[]).includes(id)) return id as JobStatus
        return JOB_STATUSES.find(status => columns[status].includes(id)) ?? null
    }

    function onDragStart (event: DragStartEvent) {
        setActiveId(String(event.active.id))
    }

    // Moving across columns while dragging, so the card previews in its new spot.
    function onDragOver ({ active, over }: DragOverEvent) {
        if (!over) return
        const from = containerOf(String(active.id))
        const to = containerOf(String(over.id))
        if (!from || !to || from === to) return
        setColumns(current => {
            const source = current[from].filter(id => id !== active.id)
            const target = [...current[to]]
            const overIndex = target.indexOf(String(over.id))
            target.splice(overIndex >= 0 ? overIndex : target.length, 0, String(active.id))
            return { ...current, [from]: source, [to]: target }
        })
    }

    function onDragEnd ({ active, over }: DragEndEvent) {
        setActiveId(null)
        if (!over) return
        const status = containerOf(String(active.id))
        if (!status) return
        let ids = columns[status]
        const oldIndex = ids.indexOf(String(active.id))
        const newIndex = ids.indexOf(String(over.id))
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
            ids = arrayMove(ids, oldIndex, newIndex)
            setColumns(current => ({ ...current, [status]: ids }))
        }
        const job = byId.get(String(active.id))
        if (job && (job.status !== status || oldIndex !== newIndex)) onMove(job.id, status, ids)
    }

    const active = activeId ? byId.get(activeId) : null

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setColumns(toColumns(jobs)) }}>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
                {JOB_STATUSES.map(status => (
                    <Column key={status} status={status} count={columns[status].length}>
                        <SortableContext items={columns[status]} strategy={verticalListSortingStrategy}>
                            {columns[status].map(id => {
                                const job = byId.get(id)
                                if (!job) return null
                                return (
                                    <SortableCard key={id} job={job}>
                                        <JobCard job={{ ...job, status }} resumeTitle={job.resume_id ? resumeTitles.get(job.resume_id) ?? null : null} today={today} now={now} onOpen={() => onOpen(job)} />
                                    </SortableCard>
                                )
                            })}
                        </SortableContext>
                        {columns[status].length === 0 && <p className="px-2 py-6 text-center text-xs text-dim">Drop here</p>}
                    </Column>
                ))}
            </div>
            <DragOverlay>
                {active ? <JobCard job={active} resumeTitle={active.resume_id ? resumeTitles.get(active.resume_id) ?? null : null} today={today} now={now} dragging /> : null}
            </DragOverlay>
        </DndContext>
    )
}
