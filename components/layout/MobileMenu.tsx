"use client"

import * as React from "react"
import Link from "next/link"
import { LuChevronDown, LuChevronRight, LuX } from "react-icons/lu"
import Logo from "@/components/ui/Logo"
import { navItems, startProjectLink } from "@/utils/data"
import { isItemActive, isLinkActive } from "@/components/layout/nav-utils"

type Props = {
    open: boolean
    pathname: string
    onClose: () => void
    returnFocusRef: React.RefObject<HTMLButtonElement | null>
}

const activeMenuIds = (pathname: string) =>
    navItems.filter(item => item.kind === "menu" && isItemActive(pathname, item)).map(item => (item.kind === "menu" ? item.id : ""))

// Full-screen menu below 1200px. Submenus expand inline; the one containing the current
// page starts expanded. Locks scroll, traps focus, closes on Escape.
export default function MobileMenu ({ open, pathname, onClose, returnFocusRef }: Props) {
    const panelRef = React.useRef<HTMLDivElement>(null)
    const [expanded, setExpanded] = React.useState<string[]>(() => activeMenuIds(pathname))
    const [lastPathname, setLastPathname] = React.useState(pathname)

    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setExpanded(activeMenuIds(pathname))
    }

    React.useEffect(() => {
        if (!open) return
        const panel = panelRef.current
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        panel?.querySelector<HTMLElement>("button[data-close]")?.focus()

        function onKeyDown (event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose()
                return
            }
            if (event.key !== "Tab" || !panel) return
            const focusable = [...panel.querySelectorAll<HTMLElement>("a, button")].filter(el => el.offsetParent !== null)
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
        const returnTarget = returnFocusRef.current
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener("keydown", onKeyDown)
            returnTarget?.focus()
        }
    }, [open, onClose, returnFocusRef])

    const toggle = (id: string) => setExpanded(current => (current.includes(id) ? current.filter(entry => entry !== id) : [...current, id]))
    const rowClass = (active: boolean) =>
        `flex w-full items-center gap-4 border-b border-white/6 py-5 text-left text-2xl font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${active ? "text-accent-1" : "text-muted hover:text-white"}`
    const StartIcon = startProjectLink.icon

    return (
        <div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            inert={!open}
            className={`fixed inset-0 z-60 flex flex-col overflow-y-auto bg-[linear-gradient(180deg,#0b0714,#120a1f)] px-6 pt-5 pb-6 transition-all duration-250 ease-out lg:hidden ${open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0"}`}
        >
            <div className="flex items-center justify-between">
                <Link href="/" onClick={onClose} aria-label="Rogers, home">
                    <Logo />
                </Link>
                <button type="button" data-close onClick={onClose} aria-label="Close menu" className="-mr-2 inline-flex size-12 items-center justify-center rounded-lg text-white hover:bg-white/6">
                    <LuX className="size-7" aria-hidden="true" />
                </button>
            </div>

            <nav className="mt-6 flex-1" aria-label="Main">
                <ul>
                    {navItems.map(item => {
                        const Icon = item.icon
                        const active = isItemActive(pathname, item)

                        if (item.kind === "link") {
                            return (
                                <li key={item.href}>
                                    <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={rowClass(active)}>
                                        <Icon className="size-5.5 shrink-0" aria-hidden="true" />
                                        {item.label}
                                    </Link>
                                </li>
                            )
                        }

                        const isExpanded = expanded.includes(item.id)
                        const Chevron = item.id === "learn" ? LuChevronRight : LuChevronDown
                        const panelId = `mobile-submenu-${item.id}`
                        return (
                            <li key={item.id}>
                                <button type="button" onClick={() => toggle(item.id)} aria-expanded={isExpanded} aria-controls={panelId} className={rowClass(active)}>
                                    <Icon className="size-5.5 shrink-0" aria-hidden="true" />
                                    <span className="flex-1">{item.label}</span>
                                    <Chevron
                                        className={`size-5 shrink-0 transition-transform duration-200 ${isExpanded ? (item.id === "learn" ? "rotate-90" : "rotate-180") : ""}`}
                                        aria-hidden="true"
                                    />
                                </button>
                                <div id={panelId} className={`grid transition-all duration-250 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <div className="overflow-hidden" inert={!isExpanded}>
                                        <ul className="py-3">
                                            {item.children.map(child => {
                                                const current = isLinkActive(pathname, child.href)
                                                return (
                                                    <li key={child.href}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={onClose}
                                                            aria-current={current ? "page" : undefined}
                                                            className={`block py-2.5 pl-10 text-lg transition-colors hover:text-accent-1 ${current ? "text-accent-1" : "text-white"}`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                    <li>
                        <Link
                            href={startProjectLink.href}
                            onClick={onClose}
                            aria-current={isLinkActive(pathname, startProjectLink.href) ? "page" : undefined}
                            className={rowClass(isLinkActive(pathname, startProjectLink.href))}
                        >
                            <StartIcon className="size-5.5 shrink-0" aria-hidden="true" />
                            {startProjectLink.label}
                        </Link>
                    </li>
                </ul>
            </nav>

            <p className="mt-10 text-center text-xs text-dim">© 2017–{new Date().getFullYear()} Rogers. All Rights Reserved.</p>
        </div>
    )
}
