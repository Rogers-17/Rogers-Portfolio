"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiArrowDown, FiArrowUp, FiEdit2, FiExternalLink, FiTrash2 } from "react-icons/fi"
import { useDialog } from "@/components/admin/Dialog"
import { adminFetch } from "@/lib/admin/client"
import { Switch, iconButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"

export type ListSwitch = { field: string, label: string, checked: boolean }

export type ListItem = {
    id: string
    title: string
    subtitle?: string | null
    meta?: string | null
    preview?: string | null
    badge?: string | null
    imageUrl: string | null
    initials: string
    roundImage?: boolean
    editHref: string
    viewHref?: string | null
    switches: ListSwitch[]
}

type Props = {
    items: ListItem[]
    endpoint: string
    itemLabel: string
    allowDelete?: boolean
    emptyTitle: string
    emptyHint: string
    newHref: string
    notice?: (items: ListItem[]) => React.ReactNode
}

// Responsive, reorderable list with inline switches. Phones: stacked card with a control row;
// md+: a single row. All controls are ≥40px touch targets below lg.
export default function ContentList ({ items: initialItems, endpoint, itemLabel, allowDelete = false, emptyTitle, emptyHint, newHref, notice }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const [items, setItems] = React.useState(initialItems)
    const [busy, setBusy] = React.useState(false)

    async function toggle (id: string, field: string, value: boolean) {
        const previous = items
        setItems(current => current.map(item => item.id === id
            ? { ...item, switches: item.switches.map(entry => (entry.field === field ? { ...entry, checked: value } : entry)) }
            : item))

        const result = await adminFetch(`${endpoint}/${id}/toggle`, { json: { field, value } })
        if (!result.ok) {
            setItems(previous)
            notify(result.error.message, "error")
        }
    }

    async function move (index: number, direction: -1 | 1) {
        const target = index + direction
        if (target < 0 || target >= items.length) return

        const previous = items
        const reordered = [...items]
        ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
        setItems(reordered)
        setBusy(true)

        const result = await adminFetch(`${endpoint}/reorder`, { json: { ids: reordered.map(item => item.id) } })
        setBusy(false)
        if (!result.ok) {
            setItems(previous)
            notify(result.error.message, "error")
        }
    }

    async function remove (item: ListItem) {
        if (!(await confirm({ title: `Delete “${item.title}”?`, message: "This can't be undone.", confirmLabel: "Delete", tone: "danger" }))) return
        setBusy(true)
        const result = await adminFetch(`${endpoint}/${item.id}/delete`, { method: "POST" })
        setBusy(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setItems(current => current.filter(entry => entry.id !== item.id))
        notify(`${itemLabel} deleted.`)
        router.refresh()
    }

    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center md:p-12">
                <p className="font-semibold">{emptyTitle}</p>
                <p className="mt-1 text-sm text-muted">{emptyHint}</p>
                <Link href={newHref} className="mt-5 inline-block text-sm font-bold text-accent-1 hover:underline">Create one →</Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {notice?.(items)}

            <ul className="flex flex-col gap-3">
                {items.map((item, index) => (
                    <li key={item.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/6 bg-card p-4 md:flex-row md:items-center md:gap-5">
                        <div className="flex min-w-0 items-start gap-3 md:flex-1 md:items-center md:gap-4">
                            <div className={`relative size-12 shrink-0 overflow-hidden bg-white/6 md:size-14 ${item.roundImage ? "rounded-full" : "rounded-lg"}`}>
                                {item.imageUrl ? (
                                    <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                                ) : (
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted">{item.initials}</span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link href={item.editHref} className="min-w-0 truncate font-bold hover:text-accent-1">{item.title}</Link>
                                    {item.badge && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">{item.badge}</span>}
                                </div>
                                {item.subtitle && <p className="truncate text-sm text-muted">{item.subtitle}</p>}
                                {item.meta && <p className="mt-0.5 text-xs text-dim">{item.meta}</p>}
                                {item.preview && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{item.preview}</p>}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-white/6 pt-3 md:justify-end md:border-0 md:pt-0">
                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${item.title} up`} className={iconButtonClass}>
                                    <FiArrowUp aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === items.length - 1} aria-label={`Move ${item.title} down`} className={iconButtonClass}>
                                    <FiArrowDown aria-hidden="true" />
                                </button>
                            </div>

                            {/* Phones: switches take the first full row; arrows (left) and actions (right) share the second. */}
                            <div className="order-first flex w-full flex-wrap items-center gap-x-5 gap-y-2 md:order-none md:w-auto">
                                {item.switches.map(entry => (
                                    <label key={entry.field} className="flex min-h-10 items-center gap-2 text-sm text-muted">
                                        <Switch checked={entry.checked} onChange={value => toggle(item.id, entry.field, value)} label={`${entry.label}: ${item.title}`} />
                                        {entry.label}
                                    </label>
                                ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Link href={item.editHref} aria-label={`Edit ${item.title}`} className={iconButtonClass}>
                                    <FiEdit2 aria-hidden="true" />
                                </Link>
                                {item.viewHref && (
                                    <a href={item.viewHref} target="_blank" rel="noopener noreferrer" aria-label={`View ${item.title} on the site`} className={iconButtonClass}>
                                        <FiExternalLink aria-hidden="true" />
                                    </a>
                                )}
                                {allowDelete && (
                                    <button type="button" onClick={() => remove(item)} disabled={busy} aria-label={`Delete ${item.title}`} className={`${iconButtonClass} hover:border-rose-500 hover:text-rose-400`}>
                                        <FiTrash2 aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
