import "server-only"

// Minimal Resend client over its REST API (no SDK dependency). Server-only: the key must
// never reach the browser. https://resend.com/docs/api-reference/emails/send-email

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const TIMEOUT_MS = 8000

type EmailInput = { from: string, to: string[], subject: string, text: string }

export function resendApiKey (): string | null {
    return process.env.RESEND_API_KEY?.trim() || null
}

// Never throws. Logs only the status code: no body, no recipient, no key.
export async function sendEmail (input: EmailInput): Promise<{ ok: boolean }> {
    const key = resendApiKey()
    if (!key) return { ok: false }

    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify(input),
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!response.ok) console.error("[email] Resend rejected the message:", response.status)
        return { ok: response.ok }
    } catch (error) {
        console.error("[email] Resend request failed:", error instanceof Error ? error.name : "unknown")
        return { ok: false }
    }
}
