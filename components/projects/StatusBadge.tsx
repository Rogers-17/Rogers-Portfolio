import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/shared"

const statusDots: Record<ProjectStatus, string> = {
    active: "bg-[#3ee03e]",
    in_development: "bg-amber-400",
    completed: "bg-accent-2",
    archived: "bg-dim",
}

export default function StatusBadge ({ status, className = "" }: { status: ProjectStatus, className?: string }) {
    const label = PROJECT_STATUS_LABELS[status]
    const dot = statusDots[status]
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span className={`size-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            {label}
        </span>
    )
}
