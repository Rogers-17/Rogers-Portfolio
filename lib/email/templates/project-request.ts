import "server-only"
import type { z } from "zod"
import { EMAIL, escapeHtml, escapeMultiline, renderEmailLayout } from "@/lib/email/html"
import type { projectRequestSchema } from "@/lib/project-request/schema"
import { absoluteUrl } from "@/lib/site"

export type ProjectRequestData = z.infer<typeof projectRequestSchema>

const CHANNEL_LABELS: Record<ProjectRequestData["channel"], string> = { whatsapp: "WhatsApp", email: "Email", callback: "Call / text back" }

// Owner notification for a new Start-a-project request. All visitor text is escaped; the only
// values placed in href/src are URLs we build (site URL + UUID) and digits-only phone strings.
export function renderProjectRequestEmail (request: ProjectRequestData, id: string) {
    const dashboardUrl = absoluteUrl(`/admin/inquiries/${encodeURIComponent(id)}`)
    // Strip line breaks so visitor text can't add lines to the subject.
    const subject = `New project request: ${request.business_name}`.replace(/[\r\n]+/g, " ").slice(0, 120)
    const deadline = request.is_flexible || !request.deadline_date
        ? "Flexible"
        : [request.deadline_date, request.deadline_time].filter(Boolean).join(" at ")
    const phoneDigits = request.visitor_phone?.replace(/\D/g, "") ?? ""

    const rows: [string, string][] = [
        ["Location", request.location],
        ["Project type", request.project_type],
        ["Budget", request.budget],
        ["Deadline", deadline],
        ["Preferred channel", CHANNEL_LABELS[request.channel]],
        ...(request.visitor_phone ? [["Phone", request.visitor_phone] as [string, string]] : []),
    ]

    // ---- Plain text (always sent) ----
    const text = [
        "A new project request was submitted on your portfolio.",
        "",
        `Name: ${request.name}`,
        `Business / product: ${request.business_name}`,
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        "Details:",
        request.details,
        "",
        `Open in the dashboard: ${dashboardUrl}`,
    ].join("\n")

    // ---- HTML ----
    const rowHtml = rows.map(([label, value], index) => `
      <tr>
        <td style="padding:12px 0;${index ? `border-top:1px solid ${EMAIL.border};` : ""}font-family:${EMAIL.font};font-size:13px;line-height:1.5;color:${EMAIL.muted};text-transform:uppercase;letter-spacing:0.5px;width:42%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:12px 0;${index ? `border-top:1px solid ${EMAIL.border};` : ""}font-family:${EMAIL.font};font-size:15px;line-height:1.5;color:${EMAIL.fg};font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`).join("")

    const bodyHtml = `
      <p style="margin:16px 0 0 0;font-family:${EMAIL.font};font-size:15px;line-height:1.7;color:${EMAIL.muted};">Someone just filled in the Start a Project form on your portfolio. Here are the details.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid ${EMAIL.border};border-bottom:1px solid ${EMAIL.border};">
        ${rowHtml}
      </table>

      <p style="margin:28px 0 0 0;font-family:${EMAIL.font};font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${EMAIL.accent1};">Project details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        <tr>
          <td bgcolor="${EMAIL.surface}" style="background-color:${EMAIL.surface};border:1px solid ${EMAIL.border};border-radius:14px;padding:18px 20px;font-family:${EMAIL.font};font-size:15px;line-height:1.75;color:${EMAIL.fg};">${escapeMultiline(request.details)}</td>
        </tr>
      </table>`

    const quickLinks = phoneDigits
        ? `<p style="margin:18px 0 0 0;font-family:${EMAIL.font};font-size:14px;color:${EMAIL.muted};">Reply now:
             <a href="https://wa.me/${phoneDigits}" target="_blank" style="color:${EMAIL.accent1};font-weight:600;text-decoration:none;">WhatsApp</a>
             &nbsp;&middot;&nbsp;
             <a href="tel:+${phoneDigits}" style="color:${EMAIL.accent1};font-weight:600;text-decoration:none;">Call</a>
           </p>`
        : ""

    const html = renderEmailLayout({
        preheader: `${request.name} · ${request.project_type} · ${request.budget}`,
        badge: "New project request 🚀",
        heading: request.business_name,
        highlight: `from ${request.name}`,
        bodyHtml,
        cta: { label: "Open in dashboard", href: dashboardUrl },
        afterCtaHtml: quickLinks,
    })

    return { subject, html, text }
}
