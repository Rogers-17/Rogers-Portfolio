"use client"

import * as React from "react"
import Link from "next/link"
import { LuChevronDown } from "react-icons/lu"
import type { NavItem } from "@/types/type"
import { isLinkActive } from "@/components/layout/nav-utils"

type MenuItem = Extract<NavItem, { kind: "menu" }>

type Props = {
    item: MenuItem
    pathname: string
    active: boolean
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

const CLOSE_DELAY_MS = 120

// Desktop submenu: opens on hover (with a short close delay so the pointer can reach the
// panel), click/tap, or keyboard (Enter/Space, ArrowDown). Escape / outside click close it.
export default function NavDropdown ({ item, pathname, active, isOpen, onOpenChange }: Props) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const panelId = `nav-menu-${item.id}`

    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        closeTimer.current = null
    }
    const open = () => {
        cancelClose()
        onOpenChange(true)
    }
    const scheduleClose = () => {
        cancelClose()
        closeTimer.current = setTimeout(() => onOpenChange(false), CLOSE_DELAY_MS)
    }

    const menuLinks = () => [...(containerRef.current?.querySelectorAll<HTMLAnchorElement>(`#${panelId} a`) ?? [])]
    const focusLink = (index: number) => {
        const links = menuLinks()
        if (links.length === 0) return
        links[(index + links.length) % links.length].focus()
    }

    React.useEffect(() => {
        if (!isOpen) return
        function onPointerDown (event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false)
        }
        function onKeyDown (event: KeyboardEvent) {
            if (event.key === "Escape") {
                onOpenChange(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [isOpen, onOpenChange])

    React.useEffect(() => cancelClose, [])

    return (
        <div ref={containerRef} className="relative" onMouseEnter={open} onMouseLeave={scheduleClose}>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onOpenChange(!isOpen)}
                onKeyDown={event => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault()
                        open()
                        requestAnimationFrame(() => focusLink(0))
                    }
                }}
                className={`flex items-center gap-1.5 text-[15px] uppercase tracking-wide transition-colors duration-200 hover:text-accent-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-1 ${active || isOpen ? "text-accent-1" : "text-white"}`}
            >
                {item.label}
                <LuChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {/* pt-3.5 bridges the gap between trigger and panel so hover isn't lost. */}
            <div
                id={panelId}
                className={`absolute top-full left-1/2 z-50 w-72 -translate-x-1/2 pt-3.5 transition-all duration-150 ${isOpen ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"}`}
                onKeyDown={event => {
                    const links = menuLinks()
                    const index = links.indexOf(document.activeElement as HTMLAnchorElement)
                    if (event.key === "ArrowDown") { event.preventDefault(); focusLink(index + 1) }
                    if (event.key === "ArrowUp") { event.preventDefault(); focusLink(index - 1) }
                }}
            >
                <div className="relative rounded-xl border border-white/10 bg-[#140b22] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-t border-l border-white/10 bg-[#140b22]" aria-hidden="true" />
                    <ul className="relative flex flex-col gap-1">
                        {item.children.map(child => {
                            const current = isLinkActive(pathname, child.href)
                            return (
                                <li key={child.href}>
                                    <Link
                                        href={child.href}
                                        aria-current={current ? "page" : undefined}
                                        onClick={() => onOpenChange(false)}
                                        className={`block rounded-lg px-5 py-3.5 text-sm font-bold uppercase tracking-wide outline-none transition-colors duration-150 hover:bg-linear-65/srgb hover:from-accent-1 hover:to-accent-2 hover:text-white focus-visible:bg-linear-65/srgb focus-visible:from-accent-1 focus-visible:to-accent-2 focus-visible:text-white ${current ? "bg-linear-65/srgb from-accent-1 to-accent-2 text-white" : "text-fg/90"}`}
                                    >
                                        {child.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </div>
    )
}
