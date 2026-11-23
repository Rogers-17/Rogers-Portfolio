"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FiArrowUp, FiRefreshCw, FiTrash2, FiX, FiZap } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import { useToast } from "@/components/admin/Toast"
import ProposalCard, { type CardState } from "@/components/admin/assistant/ProposalCard"
import { HISTORY_MAX, MESSAGE_MAX, type AgentReply, type AgentUsage, type ChatMessage } from "@/lib/agent/schemas"

type Entry =
    | { id: string, role: "user", text: string }
    | { id: string, role: "assistant", text: string, cards: CardState[] }
    | { id: string, role: "error", text: string }

const STORAGE_KEY = "admin-assistant:v1"
const KEEP_ENTRIES = 40
const COUNTER_FROM = MESSAGE_MAX - 400
const EXAMPLES = ["Add a new project", "Unpublish a testimonial", "Update my current job"]
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
const DONE_TOAST: Record<CardState["proposal"]["op"], string> = { create: "Created", update: "Updated", toggle: "Updated", delete: "Deleted" }

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()))

type Stored = { entries: Entry[], draft: string }

function readStored (): Stored {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return { entries: [], draft: "" }
        const parsed = JSON.parse(raw) as Partial<Stored>
        const entries = Array.isArray(parsed.entries) ? parsed.entries : []
        // A confirm that was in flight when the page changed is shown as pending again.
        return {
            entries: entries.map(entry => (entry.role === "assistant" ? { ...entry, cards: entry.cards.map(card => (card.status === "confirming" ? { ...card, status: "pending" as const } : card)) } : entry)),
            draft: typeof parsed.draft === "string" ? parsed.draft : "",
        }
    } catch {
        return { entries: [], draft: "" }
    }
}

function writeStored (value: Stored) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: value.entries.slice(-KEEP_ENTRIES), draft: value.draft }))
    } catch {
        // Storage can be unavailable (private mode, quota); the chat still works in memory.
    }
}

// What the model sees of earlier turns: text plus a short note about each card's outcome.
function toHistory (entries: Entry[]): ChatMessage[] {
    const messages: ChatMessage[] = []
    for (const entry of entries) {
        if (entry.role === "error") continue
        if (entry.role === "user") {
            messages.push({ role: "user", text: entry.text.slice(0, MESSAGE_MAX) })
            continue
        }
        const notes = entry.cards.map(card => {
            const outcome = card.status === "done" ? "confirmed and saved" : card.status === "discarded" ? "discarded by the owner" : "not confirmed yet"
            return `[${card.proposal.summary}: ${outcome}]`
        })
        const text = [entry.text, ...notes].join("\n").slice(0, MESSAGE_MAX)
        if (text.trim()) messages.push({ role: "assistant", text })
    }
    return messages.slice(-HISTORY_MAX)
}

type Props = { open: boolean, onClose: () => void }

export default function AssistantDrawer ({ open, onClose }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const [entries, setEntries] = React.useState<Entry[]>([])
    const [draft, setDraft] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [usage, setUsage] = React.useState<AgentUsage | null>(null)
    const [hydrated, setHydrated] = React.useState(false)

    const panelRef = React.useRef<HTMLDivElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLTextAreaElement>(null)
    const returnFocusRef = React.useRef<HTMLElement | null>(null)

    // Restore this tab's chat after hydration (sessionStorage isn't available on the server).
    React.useEffect(() => {
        const stored = readStored()
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only restore
        setEntries(stored.entries)
        setDraft(stored.draft)
        setHydrated(true)
    }, [])

    React.useEffect(() => {
        if (hydrated) writeStored({ entries, draft })
    }, [entries, draft, hydrated])

    // Keep the newest message in view.
    React.useEffect(() => {
        const list = listRef.current
        if (list) list.scrollTop = list.scrollHeight
    }, [entries, loading, open])

    // Focus management: focus the composer on open, trap Tab, Esc closes, restore focus on close.
    React.useEffect(() => {
        if (!open) return
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const panel = panelRef.current
        requestAnimationFrame(() => inputRef.current?.focus())

        function onKeyDown (event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault()
                onClose()
                return
            }
            if (event.key !== "Tab" || !panel) return
            const focusable = [...panel.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled]), a[href]")]
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            returnFocusRef.current?.focus()
        }
    }, [open, onClose])

    // Auto-grow the composer from 1 to 6 rows.
    React.useLayoutEffect(() => {
        const input = inputRef.current
        if (!input) return
        input.style.height = "auto"
        input.style.height = `${Math.min(input.scrollHeight, 6 * 20 + 20)}px`
    }, [draft, open])

    async function send (text: string, base: Entry[]) {
        const message = text.trim().slice(0, MESSAGE_MAX)
        if (!message || loading) return
        const userEntry: Entry = { id: newId(), role: "user", text: message }
        const next = [...base, userEntry]
        setEntries(next)
        setDraft("")
        setLoading(true)

        const result = await adminFetch<AgentReply>("/api/admin/agent", { json: { messages: [...toHistory(base), { role: "user", text: message }] } })
        setLoading(false)

        if (!result.ok) {
            setEntries(current => [...current, { id: newId(), role: "error", text: result.error.message }])
            return
        }
        setUsage(result.data.usage)
        setEntries(current => [...current, {
            id: newId(),
            role: "assistant",
            text: result.data.reply,
            cards: result.data.proposals.map(proposal => ({ proposal, status: "pending" as const })),
        }])
    }

    function retry () {
        const lastUser = [...entries].reverse().find(entry => entry.role === "user")
        if (!lastUser) return
        const index = entries.lastIndexOf(lastUser)
        void send(lastUser.text, entries.slice(0, index))
    }

    function updateCard (entryId: string, proposalId: string, patch: Partial<CardState>) {
        setEntries(current => current.map(entry => (entry.id === entryId && entry.role === "assistant"
            ? { ...entry, cards: entry.cards.map(card => (card.proposal.id === proposalId ? { ...card, ...patch } : card)) }
            : entry)))
    }

    async function confirm (entryId: string, card: CardState) {
        updateCard(entryId, card.proposal.id, { status: "confirming", error: undefined })
        const result = await adminFetch<{ label: string }>("/api/admin/agent/confirm", { json: { proposal: card.proposal } })
        if (!result.ok) {
            const issue = result.error.issues?.[0]
            updateCard(entryId, card.proposal.id, { status: "pending", error: issue ? `${result.error.message} (${issue.path}: ${issue.message})` : result.error.message })
            return
        }
        updateCard(entryId, card.proposal.id, { status: "done" })
        notify(`${DONE_TOAST[card.proposal.op]} “${card.proposal.label}”`)
        router.refresh()
    }

    function clear () {
        setEntries([])
        setDraft("")
        try {
            sessionStorage.removeItem(STORAGE_KEY)
        } catch {
            // ignore
        }
        inputRef.current?.focus()
    }

    function onSubmit (event: React.FormEvent) {
        event.preventDefault()
        void send(draft, entries)
    }

    function onKeyDown (event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            void send(draft, entries)
        }
    }

    const lastEntry = entries[entries.length - 1]

    return (
        <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
            <button
                type="button"
                tabIndex={-1}
                aria-label="Close assistant"
                onClick={onClose}
                className={`absolute inset-0 bg-black/50 transition-opacity duration-200 md:hidden ${open ? "opacity-100" : "opacity-0"}`}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="assistant-title"
                className={`pointer-events-auto absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/8 bg-surface/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-out md:w-[420px] ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 px-4">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent-1 to-accent-2 text-white" aria-hidden="true"><FiZap size={14} /></span>
                    <div className="min-w-0 flex-1">
                        <h2 id="assistant-title" className="text-sm font-semibold text-fg">Assistant</h2>
                        <p className="truncate text-xs text-muted">{usage ? `Gemini · ${usage.used}/${usage.limit} today` : "Gemini · changes need your confirmation"}</p>
                    </div>
                    <button type="button" onClick={clear} disabled={loading || entries.length === 0} aria-label="Clear chat" title="Clear chat" className={`inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-white/4 hover:text-white disabled:opacity-40 ${focusRing}`}>
                        <FiTrash2 aria-hidden="true" />
                    </button>
                    <button type="button" onClick={onClose} aria-label="Close assistant" title="Close (Esc)" className={`inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-white/4 hover:text-white ${focusRing}`}>
                        <FiX size={18} aria-hidden="true" />
                    </button>
                </header>

                <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
                    {entries.length === 0 && !loading && (
                        <div className="m-auto flex max-w-xs flex-col items-center gap-4 text-center">
                            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-accent-1 to-accent-2 text-white" aria-hidden="true"><FiZap size={22} /></span>
                            <div>
                                <p className="text-sm font-semibold text-fg">What should we change?</p>
                                <p className="mt-1 text-xs leading-relaxed text-muted">Ask me to add, edit or remove projects, experience, testimonials, blog posts, jobs and more. Nothing is saved until you confirm.</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {EXAMPLES.map(example => (
                                    <button key={example} type="button" onClick={() => { setDraft(example); inputRef.current?.focus() }} className={`rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:border-white/20 hover:text-white ${focusRing}`}>
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {entries.map(entry => {
                        if (entry.role === "user") {
                            return (
                                <div key={entry.id} className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-accent-2/30 bg-accent-2/20 px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap text-fg">
                                    {entry.text}
                                </div>
                            )
                        }
                        if (entry.role === "error") {
                            return (
                                <div key={entry.id} role="alert" className="flex items-start gap-2.5">
                                    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300" aria-hidden="true"><FiZap size={14} /></span>
                                    <div className="min-w-0 flex-1 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
                                        <p className="break-words">{entry.text}</p>
                                        {entry === lastEntry && (
                                            <button type="button" onClick={retry} disabled={loading} className={`mt-2 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-rose-100 hover:underline disabled:opacity-50 ${focusRing}`}>
                                                <FiRefreshCw aria-hidden="true" /> Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                        return (
                            <div key={entry.id} className="flex items-start gap-2.5">
                                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent-1 to-accent-2 text-white" aria-hidden="true"><FiZap size={14} /></span>
                                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                                    {entry.text && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-fg/90">{entry.text}</p>}
                                    {entry.cards.map(card => (
                                        <ProposalCard
                                            key={card.proposal.id}
                                            card={card}
                                            onConfirm={() => void confirm(entry.id, card)}
                                            onDiscard={() => updateCard(entry.id, card.proposal.id, { status: "discarded", error: undefined })}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {loading && (
                        <div className="flex items-center gap-2.5" aria-label="Assistant is typing">
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent-1 to-accent-2 text-white" aria-hidden="true"><FiZap size={14} /></span>
                            <span className="flex gap-1 rounded-2xl bg-card px-3.5 py-3" aria-hidden="true">
                                {[0, 150, 300].map(delay => <span key={delay} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${delay}ms` }} />)}
                            </span>
                        </div>
                    )}
                </div>

                <form onSubmit={onSubmit} className="shrink-0 border-t border-white/8 p-3">
                    <div className="flex items-end gap-2">
                        <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
                        <textarea
                            id="assistant-input"
                            ref={inputRef}
                            rows={1}
                            value={draft}
                            maxLength={MESSAGE_MAX}
                            onChange={event => setDraft(event.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Ask me to add, edit or remove something…"
                            className={`max-h-36 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-card px-3.5 py-2.5 text-sm leading-5 text-fg placeholder:text-dim ${focusRing}`}
                        />
                        <button
                            type="submit"
                            disabled={loading || !draft.trim()}
                            aria-label="Send"
                            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-r from-accent-1 to-accent-2 text-white hover:opacity-90 disabled:opacity-40 ${focusRing}`}
                        >
                            <FiArrowUp size={18} aria-hidden="true" />
                        </button>
                    </div>
                    {draft.length >= COUNTER_FROM && <p className="mt-1.5 text-right text-[11px] text-muted">{draft.length}/{MESSAGE_MAX}</p>}
                </form>
            </div>
        </div>
    )
}
