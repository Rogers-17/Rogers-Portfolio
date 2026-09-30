import type { Channel, RequestStatus } from "@/lib/project-request/schema"

export const STATUS_LABELS: Record<RequestStatus, string> = {
    new: "New",
    contacted: "Contacted",
    won: "Won",
    lost: "Lost",
    archived: "Archived",
}

export const STATUS_STYLES: Record<RequestStatus, string> = {
    new: "bg-accent-1/15 text-fuchsia-200",
    contacted: "bg-sky-500/15 text-sky-200",
    won: "bg-emerald-500/15 text-emerald-200",
    lost: "bg-rose-500/15 text-rose-200",
    archived: "bg-white/8 text-muted",
}

export const CHANNEL_LABELS: Record<Channel, string> = {
    whatsapp: "WhatsApp",
    email: "Email",
    callback: "Call / text request",
}

export function formatSubmitted (iso: string) {
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
        ? iso
        : date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
