import Link from "next/link"
import { FiMail, FiMessageCircle, FiPhone } from "react-icons/fi"
import { STATUS_LABELS, STATUS_STYLES, formatSubmitted } from "@/components/admin/inquiry-labels"
import { requireAdminPage } from "@/lib/admin/auth"
import { listProjectRequests } from "@/lib/admin/page-queries"
import { REQUEST_STATUSES, type Channel, type RequestStatus } from "@/lib/project-request/schema"

type Props = { searchParams: Promise<{ status?: string }> }

const CHANNEL_ICONS: Record<Channel, typeof FiPhone> = { whatsapp: FiMessageCircle, email: FiMail, callback: FiPhone }

export default async function AdminInquiriesPage ({ searchParams }: Props) {
    const { status: rawStatus } = await searchParams
    const status = (REQUEST_STATUSES as readonly string[]).includes(rawStatus ?? "") ? (rawStatus as RequestStatus) : undefined

    const { supabase } = await requireAdminPage()
    const inquiries = await listProjectRequests(supabase, status)

    const filters: { label: string, href: string, active: boolean }[] = [
        { label: "All", href: "/admin/inquiries", active: !status },
        ...REQUEST_STATUSES.map(value => ({ label: STATUS_LABELS[value], href: `/admin/inquiries?status=${value}`, active: status === value })),
    ]

    return (
        <>
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl font-bold md:text-3xl">Inquiries</h1>
                <p className="mt-1 text-sm text-muted">Requests from the Start A Project form, newest first.</p>
            </div>

            <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label="Filter by status">
                {filters.map(filter => (
                    <Link
                        key={filter.label}
                        href={filter.href}
                        aria-current={filter.active ? "page" : undefined}
                        className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors ${filter.active ? "bg-linear-65/srgb from-accent-1 to-accent-2 text-white" : "border border-white/10 bg-white/4 text-muted hover:text-white"}`}
                    >
                        {filter.label}
                    </Link>
                ))}
            </nav>

            {inquiries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center md:p-12">
                    <p className="font-semibold">No inquiries {status ? `marked “${STATUS_LABELS[status]}”` : "yet"}</p>
                    <p className="mt-1 text-sm text-muted">New requests from /start-a-project appear here.</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {inquiries.map(inquiry => {
                        const Icon = CHANNEL_ICONS[inquiry.channel]
                        return (
                            <li key={inquiry.id}>
                                <Link href={`/admin/inquiries/${inquiry.id}`} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4 transition-colors hover:border-accent-1/50 md:flex-row md:items-center md:gap-5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-bold">{inquiry.name}</span>
                                            <span className="text-muted">·</span>
                                            <span className="min-w-0 truncate text-muted">{inquiry.business_name}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${STATUS_STYLES[inquiry.status]}`}>{STATUS_LABELS[inquiry.status]}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted">{inquiry.project_type} · {inquiry.budget} · {inquiry.location}</p>
                                        <p className="mt-1.5 line-clamp-2 text-sm text-dim">{inquiry.details}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-t border-white/6 pt-3 text-xs text-muted md:flex-col md:items-end md:border-0 md:pt-0">
                                        <span className="inline-flex items-center gap-1.5"><Icon aria-hidden="true" /> {inquiry.channel === "callback" ? "Call / text" : inquiry.channel === "email" ? "Email" : "WhatsApp"}</span>
                                        <time dateTime={inquiry.created_at}>{formatSubmitted(inquiry.created_at)}</time>
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </>
    )
}
