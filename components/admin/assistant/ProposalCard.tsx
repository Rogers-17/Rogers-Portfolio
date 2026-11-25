"use client"

import * as React from "react"
import { FiCheck } from "react-icons/fi"
import type { Proposal } from "@/lib/agent/schemas"

export type CardStatus = "pending" | "confirming" | "done" | "discarded"
export type CardState = { proposal: Proposal, status: CardStatus, error?: string }

const OP_STYLES: Record<Proposal["op"], { label: string, badge: string }> = {
    create: { label: "Create", badge: "bg-emerald-400/10 text-emerald-300" },
    update: { label: "Update", badge: "bg-sky-400/10 text-sky-300" },
    toggle: { label: "Visibility", badge: "bg-violet-400/10 text-violet-300" },
    delete: { label: "Delete", badge: "bg-rose-400/10 text-rose-300" },
}

const DONE_VERB: Record<Proposal["op"], string> = { create: "Created", update: "Updated", toggle: "Updated", delete: "Deleted" }

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"

type Props = { card: CardState, onConfirm: () => void, onDiscard: () => void }

export default function ProposalCard ({ card, onConfirm, onDiscard }: Props) {
    const { proposal, status, error } = card
    const [reviewOpen, setReviewOpen] = React.useState(false)
    const [reviewed, setReviewed] = React.useState(false)

    if (status === "done") {
        return <p className="flex items-center gap-1.5 text-xs text-emerald-300"><FiCheck aria-hidden="true" /> {DONE_VERB[proposal.op]} {proposal.label}</p>
    }
    if (status === "discarded") return <p className="text-xs text-dim">Discarded: {proposal.summary}</p>

    const isDelete = proposal.op === "delete"
    const style = OP_STYLES[proposal.op]
    const busy = status === "confirming"

    return (
        <div className={`rounded-2xl border bg-card p-3.5 ${isDelete ? "border-rose-400/30" : "border-white/8"}`}>
            <div className="flex items-start gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>{style.label}</span>
                <p className="min-w-0 text-sm font-semibold break-words text-fg">{proposal.label}</p>
            </div>
            <p className="mt-1 text-xs text-muted">{proposal.summary}</p>

            {proposal.diff.length > 0 && (
                <dl className="mt-3 flex flex-col gap-2 border-t border-white/6 pt-3 text-xs">
                    {proposal.diff.map(row => (
                        <div key={row.field} className="min-w-0">
                            <dt className="text-muted">{row.field}</dt>
                            <dd className="mt-0.5 grid min-w-0 gap-1 break-words sm:grid-cols-2">
                                {proposal.op !== "create" && <span className="whitespace-pre-wrap text-dim">Before: {row.before}</span>}
                                <span className="whitespace-pre-wrap text-fg">After: {row.after}</span>
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {proposal.review && (
                <details className="mt-3 border-t border-white/6 pt-3" open={reviewOpen} onToggle={event => { setReviewOpen(event.currentTarget.open); if (event.currentTarget.open) setReviewed(true) }}>
                    <summary className={`cursor-pointer text-xs font-semibold text-accent-1 ${focusRing}`}>Review complete item and full result</summary>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {proposal.op !== "create" && <ReviewRecord title="Complete current item" value={proposal.review.before} />}
                        {proposal.op !== "delete" && <ReviewRecord title="Complete proposed result" value={proposal.review.after} />}
                    </div>
                </details>
            )}

            {isDelete && <p className="mt-3 text-xs text-rose-300">This can&apos;t be undone.</p>}
            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}

            <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={onDiscard} disabled={busy} className={`h-9 rounded-xl px-3 text-sm text-muted hover:bg-white/4 hover:text-white disabled:opacity-50 ${focusRing}`}>
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy || Boolean(proposal.review && !reviewed)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${isDelete ? "bg-rose-500 hover:bg-rose-500/90" : "bg-linear-to-r from-accent-1 to-accent-2 hover:opacity-90"} ${focusRing}`}
                >
                    {busy && <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                    {busy ? "Saving…" : proposal.review && !reviewed ? "Review content first" : isDelete ? "Delete" : "Confirm"}
                </button>
            </div>
        </div>
    )
}

function ReviewRecord ({ title, value }: { title: string, value: Record<string, unknown> }) {
    return <section className="min-w-0 rounded-xl border border-white/8 bg-black/20 p-3">
        <h3 className="mb-2 text-xs font-semibold text-muted">{title}</h3>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-fg">{JSON.stringify(value, null, 2)}</pre>
    </section>
}
