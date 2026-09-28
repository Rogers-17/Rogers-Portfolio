"use client"

import { secondaryButtonClass } from "@/components/admin/Field"

export default function AdminError ({ error, unstable_retry }: { error: Error & { digest?: string }, unstable_retry: () => void }) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted">{error.message.includes("temporarily unavailable") ? error.message : "This page couldn’t load. Your data is safe; try again."}</p>
            <button type="button" onClick={() => unstable_retry()} className={secondaryButtonClass}>Try again</button>
        </div>
    )
}
