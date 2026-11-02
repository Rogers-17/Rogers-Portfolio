import { resolveDocumentShare } from "@/lib/documents/shares"
import { hashIp } from "@/lib/project-request/rate-limit"

// Public: the optional download behind a share link. The link is checked again on every
// request, so it can't outlive "Expire now". Anything but a valid link goes back to the
// viewing page, which shows the right message without saying why.

type Context = { params: Promise<{ token: string }> }

export async function GET (request: Request, context: Context) {
    const { token } = await context.params
    const result = await resolveDocumentShare(token, hashIp(request), "download")
    const location = result && result !== "rate_limited" ? result.url : new URL(`/d/${encodeURIComponent(token)}`, request.url).toString()
    return new Response(null, {
        status: 307,
        headers: {
            Location: location,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
    })
}
