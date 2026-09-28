"use client"

import * as React from "react"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { loginSchema } from "@/lib/admin/schemas"
import { TextField, primaryButtonClass } from "@/components/admin/Field"

export default function LoginForm ({ next, initialError }: { next: string, initialError?: string }) {
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
    const [formError, setFormError] = React.useState<string | undefined>(initialError)

    async function handleSubmit (event: React.FormEvent) {
        event.preventDefault()
        setFormError(undefined)

        const parsed = loginSchema.safeParse({ email, password })
        if (!parsed.success) {
            setFieldErrors(issuesToRecord(parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))))
            return
        }
        setFieldErrors({})
        setSubmitting(true)

        const result = await adminFetch("/api/admin/auth/login", { json: parsed.data })
        if (result.ok) {
            // Full navigation so the freshly set session cookie is used by the proxy and server.
            window.location.assign(next)
            return
        }
        setSubmitting(false)
        setFormError(result.error.message)
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <TextField label="Email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} error={fieldErrors.email} required />
            <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} error={fieldErrors.password} required />
            {formError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{formError}</p>}
            <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full py-3`}>
                {submitting ? "Signing in…" : "Sign in"}
            </button>
        </form>
    )
}
