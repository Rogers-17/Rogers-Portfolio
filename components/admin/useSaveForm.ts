"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { z } from "zod"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { useScrollToFirstError, useUnsavedGuard, zodErrorsToRecord } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"

type Options<S> = {
    initial: S
    toPayload: (state: S) => unknown
    schema: z.ZodType
    endpoint: string
    successMessage?: string
}

// State + validation + save for editors that POST the whole form to one endpoint
// (page singletons, settings, simple edits). Tracks unsaved changes against the last save.
export function useSaveForm<S> ({ initial, toPayload, schema, endpoint, successMessage = "Saved." }: Options<S>) {
    const router = useRouter()
    const { notify } = useToast()
    const [state, setState] = React.useState(initial)
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(toPayload(initial)))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)

    const snapshot = JSON.stringify(toPayload(state))
    const isDirty = snapshot !== savedSnapshot
    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    const set = React.useCallback(<K extends keyof S>(key: K, value: S[K]) => {
        setState(current => ({ ...current, [key]: value }))
    }, [])

    async function save () {
        const parsed = schema.safeParse(toPayload(state))
        if (!parsed.success) {
            setErrors(zodErrorsToRecord(parsed.error))
            notify("Fix the highlighted fields.", "error")
            return false
        }

        setErrors({})
        setSaving(true)
        const result = await adminFetch(endpoint, { json: parsed.data })
        setSaving(false)

        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            notify(result.error.message, "error")
            return false
        }

        setSavedSnapshot(snapshot)
        notify(successMessage)
        router.refresh()
        return true
    }

    return { state, setState, set, errors, saving, isDirty, save, markSaved: () => setSavedSnapshot(snapshot) }
}
