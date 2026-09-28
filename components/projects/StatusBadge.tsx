import type { ProjectStatus } from "@/lib/projects/schema"

const statusStyles: Record<ProjectStatus, { label: string, dot: string }> = {
    active: { label: "Active", dot: "bg-[#3ee03e]" },
    in_development: { label: "In development", dot: "bg-amber-400" },
    completed: { label: "Completed", dot: "bg-accent-2" },
    archived: { label: "Archived", dot: "bg-dim" },
}

export default function StatusBadge ({ status, className = "" }: { status: ProjectStatus, className?: string }) {
    const { label, dot } = statusStyles[status]
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span className={`size-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            {label}
        </span>
    )
}
