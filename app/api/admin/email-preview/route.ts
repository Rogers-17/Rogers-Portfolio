import { requireAdminApi } from "@/lib/admin/auth"
import { renderProjectRequestEmail } from "@/lib/email/templates/project-request"

// GET /api/admin/email-preview: admin-only preview of the project-request notification,
// rendered with obviously fake sample data (no real inquiry is read). Never cached.
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const { html } = renderProjectRequestEmail({
        name: "Sample Visitor",
        location: "Liberia",
        project_type: "Web application",
        business_name: "Sample Co",
        is_flexible: false,
        deadline_date: "2027-01-15",
        deadline_time: "10:00",
        budget: "$1,000 - $3,000",
        details: "This is sample text for previewing the email design.\nLine breaks are kept, and <b>markup</b> is shown as plain text.",
        channel: "whatsapp",
        visitor_phone: "+231 770 000 000",
    }, "00000000-0000-0000-0000-000000000000")

    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })
}
