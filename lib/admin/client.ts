// Browser-side helper for calling the admin API (session cookie auth, same origin).

export type ApiIssue = { path: string, message: string }
export type ApiError = { code: string, message: string, issues?: ApiIssue[] }
export type ApiResult<T> = { ok: true, data: T } | { ok: false, error: ApiError }

export async function adminFetch<T> (url: string, init: { method?: "GET" | "POST", json?: unknown, body?: FormData } = {}): Promise<ApiResult<T>> {
    try {
        const response = await fetch(url, {
            method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
            headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
            credentials: "same-origin",
        })
        const payload = await response.json().catch(() => null)
        if (payload && typeof payload === "object" && "ok" in payload) return payload as ApiResult<T>
        return { ok: false, error: { code: "bad_response", message: `Unexpected response (${response.status}).` } }
    } catch {
        return { ok: false, error: { code: "network", message: "Network error. Check your connection and try again." } }
    }
}

export function issuesToRecord (issues: ApiIssue[] = []): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const issue of issues) {
        const key = issue.path || "_form"
        errors[key] ??= issue.message
    }
    return errors
}
