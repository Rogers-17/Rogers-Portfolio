"use client"

import * as React from "react"
import type { z } from "zod"

// Warn before closing/reloading the tab while there are unsaved changes.
export function useUnsavedGuard (isDirty: boolean) {
    React.useEffect(() => {
        if (!isDirty) return
        const warn = (event: BeforeUnloadEvent) => event.preventDefault()
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [isDirty])
}

// After validation fails, bring the first invalid field into view and focus it.
export function useScrollToFirstError (errors: Record<string, string>) {
    React.useEffect(() => {
        if (Object.keys(errors).length === 0) return
        const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']")
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" })
        firstInvalid?.focus({ preventScroll: true })
    }, [errors])
}

export function zodErrorsToRecord (error: z.ZodError): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const issue of error.issues) {
        const key = issue.path.join(".") || "_form"
        errors[key] ??= issue.message
    }
    return errors
}
