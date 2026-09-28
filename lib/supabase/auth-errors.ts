// Distinguishes "no/invalid session" (treat as signed out) from temporary Auth failures
// (rate limit, outage, network) that must NOT be treated as signed out.
export function isTransientAuthError (error: { status?: number, name?: string } | null | undefined): boolean {
    if (!error) return false
    if (error.name === "AuthRetryableFetchError") return true
    const status = error.status ?? 0
    return status === 429 || status >= 500
}
