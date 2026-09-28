"use client"

import { FiExternalLink, FiTrash2 } from "react-icons/fi"
import { primaryButtonClass, secondaryButtonClass } from "@/components/admin/Field"

type Props = {
    isNew: boolean
    isDirty: boolean
    saving: boolean
    deleting?: boolean
    createLabel: string
    onDelete?: () => void
    viewHref?: string
}

// Sticky footer for editors. Must be rendered inside the <form> (the Save button submits it).
// Offsets match the admin nav at each breakpoint: none (drawer) / md icon rail / lg sidebar.
export default function SaveBar ({ isNew, isDirty, saving, deleting = false, createLabel, onDelete, viewHref }: Props) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/6 bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:left-16 md:px-8 lg:left-60 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                <p className="text-xs text-muted md:text-sm" aria-live="polite">
                    {isDirty ? "Unsaved changes" : isNew ? "Fill in the details, then create." : "All changes saved"}
                </p>
                <div className="flex items-center gap-2 md:gap-3">
                    {!isNew && onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={deleting || saving}
                            aria-label="Delete"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        >
                            <FiTrash2 aria-hidden="true" />
                            <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
                        </button>
                    )}
                    {!isNew && viewHref && (
                        <a href={viewHref} target="_blank" rel="noopener noreferrer" className={`${secondaryButtonClass} h-10 shrink-0 px-4`}>
                            <span className="hidden sm:inline">View live</span>
                            <FiExternalLink aria-hidden="true" />
                            <span className="sr-only sm:hidden">View live</span>
                        </a>
                    )}
                    <button type="submit" disabled={saving || deleting || (!isDirty && !isNew)} className={`${primaryButtonClass} h-10 flex-1 md:flex-none`}>
                        {saving ? "Saving…" : isNew ? createLabel : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    )
}
