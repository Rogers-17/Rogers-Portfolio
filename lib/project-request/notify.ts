import "server-only"
import { resendApiKey, sendEmail } from "@/lib/email/resend"
import { renderProjectRequestEmail, type ProjectRequestData } from "@/lib/email/templates/project-request"

// Emails the owner when a Start-a-project request is saved. A no-op until RESEND_API_KEY,
// CONTACT_NOTIFY_TO and CONTACT_FROM_EMAIL are all set. Only ever sends to the configured
// owner inbox, never to an address supplied by the visitor. Branded HTML + plain text;
// visitor data is HTML-escaped by the template.
// Best effort: no retries. The saved row (Admin › Inquiries) is the source of truth.
export async function notifyNewProjectRequest (request: ProjectRequestData, id: string): Promise<void> {
    const to = process.env.CONTACT_NOTIFY_TO?.trim()
    const from = process.env.CONTACT_FROM_EMAIL?.trim()
    if (!resendApiKey() || !to || !from) return

    const { subject, html, text } = renderProjectRequestEmail(request, id)
    const { ok } = await sendEmail({ from, to: to.split(",").map(address => address.trim()).filter(Boolean), subject, html, text })
    if (!ok) console.error("[project-requests] notification email not sent for request", id)
}
