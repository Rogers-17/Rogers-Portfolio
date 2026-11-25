// Browser-side helper for calling the admin API (session cookie auth, same origin).

export type ApiIssue = { path: string, message: string }
export type ApiError = { code: string, message: string, issues?: ApiIssue[] }
export type ApiResult<T> = { ok: true, data: T } | { ok: false, error: ApiError }

export async function adminFetch<T> (url: string, init: { method?: "GET" | "POST", json?: unknown, body?: FormData, signal?: AbortSignal } = {}): Promise<ApiResult<T>> {
    try {
        const response = await fetch(url, {
            method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
            headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
            credentials: "same-origin",
            signal: init.signal,
        })
        const payload = await response.json().catch(() => null)
        if (payload && typeof payload === "object" && "ok" in payload) return payload as ApiResult<T>
        return { ok: false, error: { code: "bad_response", message: `Unexpected response (${response.status}).` } }
    } catch (error) {
        const errorName = typeof error === "object" && error !== null && "name" in error ? error.name : ""
        if (errorName === "TimeoutError" || errorName === "AbortError") {
            return { ok: false, error: { code: "timeout", message: "The request took too long. Please try again." } }
        }
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
