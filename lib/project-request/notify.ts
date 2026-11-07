import "server-only"
import type { z } from "zod"
import { resendApiKey, sendEmail } from "@/lib/email/resend"
import type { projectRequestSchema } from "@/lib/project-request/schema"
import { absoluteUrl } from "@/lib/site"

type ProjectRequest = z.infer<typeof projectRequestSchema>

const CHANNEL_LABELS: Record<ProjectRequest["channel"], string> = { whatsapp: "WhatsApp", email: "Email", callback: "Call / text back" }

// Emails the owner when a Start-a-project request is saved. A no-op until RESEND_API_KEY,
// CONTACT_NOTIFY_TO and CONTACT_FROM_EMAIL are all set. Only ever sends to the configured
// owner inbox, never to an address supplied by the visitor. Plain text: no HTML to inject.
// Best effort: no retries. The saved row (Admin › Inquiries) is the source of truth.
export async function notifyNewProjectRequest (request: ProjectRequest, id: string): Promise<void> {
    const to = process.env.CONTACT_NOTIFY_TO?.trim()
    const from = process.env.CONTACT_FROM_EMAIL?.trim()
    if (!resendApiKey() || !to || !from) return

    // Strip line breaks so visitor text can't add lines to the subject.
    const subject = `New project request: ${request.business_name}`.replace(/[\r\n]+/g, " ").slice(0, 120)
    const deadline = request.is_flexible || !request.deadline_date
        ? "Flexible"
        : [request.deadline_date, request.deadline_time].filter(Boolean).join(" ")

    const text = [
        "A new project request was submitted on your portfolio.",
        "",
        `Name: ${request.name}`,
        `Location: ${request.location}`,
        `Project type: ${request.project_type}`,
        `Business / product: ${request.business_name}`,
        `Budget: ${request.budget}`,
        `Deadline: ${deadline}`,
        `Preferred channel: ${CHANNEL_LABELS[request.channel]}`,
        ...(request.visitor_phone ? [`Phone: ${request.visitor_phone}`] : []),
        "",
        "Details:",
        request.details,
        "",
        `Open in the dashboard: ${absoluteUrl(`/admin/inquiries/${id}`)}`,
    ].join("\n")

    const { ok } = await sendEmail({ from, to: to.split(",").map(address => address.trim()).filter(Boolean), subject, text })
    if (!ok) console.error("[project-requests] notification email not sent for request", id)
}
