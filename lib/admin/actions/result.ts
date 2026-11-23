import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import { fail, mapDbError, ok, type ApiIssue } from "@/lib/admin/http"

// Admin write actions return a plain result so the same code serves the API routes
// (via toResponse) and the AI assistant's confirm route.

export type ActionFailure = { ok: false, status: number, code: string, message: string, issues?: ApiIssue[] }
export type ActionResult<T> = { ok: true, data: T } | ActionFailure

export const success = <T>(data: T): ActionResult<T> => ({ ok: true, data })

export const failure = (status: number, code: string, message: string, issues?: ApiIssue[]): ActionFailure => ({ ok: false, status, code, message, issues })

export const notFound = (label: string): ActionFailure => failure(404, "not_found", `${label} not found.`)

export function dbFailure (error: PostgrestError, context: string): ActionFailure {
    return { ok: false, ...mapDbError(error, context) }
}

export function toResponse<T> (result: ActionResult<T>, successStatus = 200) {
    return result.ok ? ok(result.data, successStatus) : fail(result.status, result.code, result.message, result.issues)
}
