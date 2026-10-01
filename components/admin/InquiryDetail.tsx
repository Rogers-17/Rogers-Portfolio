"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiMail, FiMessageCircle, FiPhone } from "react-icons/fi"
import { useDialog } from "@/components/admin/Dialog"
import SaveBar from "@/components/admin/SaveBar"
import { Card, SelectField, TextAreaField, secondaryButtonClass } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { useToast } from "@/components/admin/Toast"
import { STATUS_LABELS, CHANNEL_LABELS, formatSubmitted } from "@/components/admin/inquiry-labels"
import { adminFetch } from "@/lib/admin/client"
import type { AdminProjectRequest } from "@/lib/admin/page-queries"
import { projectRequestUpdateSchema } from "@/lib/admin/page-schemas"
import { REQUEST_STATUSES, formatDeadline, type RequestStatus } from "@/lib/project-request/schema"

type FormState = { status: RequestStatus, notes: string }
const toPayload = (state: FormState) => state

export default function InquiryDetail ({ inquiry }: { inquiry: AdminProjectRequest }) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const [deleting, setDeleting] = React.useState(false)
    const form = useSaveForm<FormState>({
        initial: { status: inquiry.status, notes: inquiry.notes ?? "" },
        toPayload,
        schema: projectRequestUpdateSchema,
        endpoint: `/api/admin/project-requests/${inquiry.id}`,
        successMessage: "Inquiry updated.",
    })

    async function handleDelete () {
        if (!(await confirm({ title: `Delete ${inquiry.name}'s inquiry?`, message: "Their request and your notes are deleted. This can't be undone.", confirmLabel: "Delete", tone: "danger" }))) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/project-requests/${inquiry.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        form.markSaved()
        notify("Inquiry deleted.")
        router.replace("/admin/inquiries")
        router.refresh()
    }

    // Built only from the validated phone value (digits, spaces, + - ( )).
    const phoneDigits = inquiry.visitor_phone?.replace(/[^\d+]/g, "") ?? null

    const rows: [string, React.ReactNode][] = [
        ["Based in", inquiry.location],
        ["Project type", inquiry.project_type],
        ["Business / product", inquiry.business_name],
        ["Needed by", formatDeadline(inquiry)],
        ["Budget", inquiry.budget],
        ["Sent via", CHANNEL_LABELS[inquiry.channel]],
        // Server and browser time zones can differ; the browser's value wins after hydration.
        ["Received", <time key="received" dateTime={inquiry.created_at} suppressHydrationWarning>{formatSubmitted(inquiry.created_at)}</time>],
    ]

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/inquiries" className="text-sm text-muted hover:text-white">← All inquiries</Link>
                <h1 className="mt-2 text-2xl font-bold break-words md:text-3xl">{inquiry.name} · {inquiry.business_name}</h1>
            </div>

            <Card title="Request">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {rows.map(([label, value]) => (
                        <div key={label} className="min-w-0">
                            <dt className="text-xs font-semibold tracking-wider text-dim uppercase">{label}</dt>
                            <dd className="mt-1 text-sm break-words">{value}</dd>
                        </div>
                    ))}
                </dl>
                <div>
                    <p className="text-xs font-semibold tracking-wider text-dim uppercase">Project details</p>
                    <p className="mt-2 rounded-xl border border-white/6 bg-white/3 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">{inquiry.details}</p>
                </div>
            </Card>

            {phoneDigits && (
                <Card title="Contact" hint={`${inquiry.name} asked you to call or text: ${inquiry.visitor_phone}`}>
                    <div className="flex flex-wrap gap-3">
                        <a href={`tel:${phoneDigits}`} className={secondaryButtonClass}><FiPhone aria-hidden="true" /> Call</a>
                        <a href={`sms:${phoneDigits}`} className={secondaryButtonClass}><FiMail aria-hidden="true" /> Text</a>
                        <a href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}><FiMessageCircle aria-hidden="true" /> WhatsApp</a>
                    </div>
                </Card>
            )}

            <Card title="Follow-up" hint="Only visible to you.">
                <SelectField label="Status" value={form.state.status} onChange={event => form.set("status", event.target.value as RequestStatus)} error={form.errors.status} className="md:max-w-xs">
                    {REQUEST_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                </SelectField>
                <TextAreaField label="Notes" rows={4} value={form.state.notes} onChange={event => form.set("notes", event.target.value)} error={form.errors.notes} hint={`${form.state.notes.length}/4000`} maxLength={4000} />
            </Card>

            <SaveBar isNew={false} isDirty={form.isDirty} saving={form.saving} deleting={deleting} createLabel="Save" onDelete={handleDelete} />
        </form>
    )
}
