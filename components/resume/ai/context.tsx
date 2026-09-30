"use client"

import * as React from "react"
import { adminFetch, type ApiResult } from "@/lib/admin/client"

// Everything AI helpers need from the editor: the current resume as text, the target role,
// the job description, and the daily usage meter. Requests go to /api/admin/ai/<action>.

export type AiUsage = { used: number, limit: number, model: string }

type AiContextValue = {
    resumeText: () => string
    targetRole: string
    jobDescription: string
    usage: AiUsage | null
    request: <T>(action: string, body: Record<string, unknown>) => Promise<ApiResult<T>>
}

const AiContext = React.createContext<AiContextValue | null>(null)

export function AiProvider ({ resumeText, targetRole, jobDescription, initialUsage, children }: {
    resumeText: () => string
    targetRole: string
    jobDescription: string
    initialUsage: AiUsage | null
    children: React.ReactNode
}) {
    const [usage, setUsage] = React.useState(initialUsage)

    const request = React.useCallback(async <T,>(action: string, body: Record<string, unknown>) => {
        const result = await adminFetch<T & { usage?: AiUsage }>(`/api/admin/ai/${action}`, { json: body })
        if (result.ok && result.data.usage) setUsage(result.data.usage)
        if (!result.ok && result.error.code === "ai_limit") setUsage(current => (current ? { ...current, used: current.limit } : current))
        return result as ApiResult<T>
    }, [])

    const value = React.useMemo(() => ({ resumeText, targetRole, jobDescription, usage, request }), [resumeText, targetRole, jobDescription, usage, request])
    return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}

export function useAi () {
    return React.useContext(AiContext)
}
