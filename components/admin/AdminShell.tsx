"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { IconType } from "react-icons"
import { FiBriefcase, FiClipboard, FiEdit3, FiExternalLink, FiGrid, FiImage, FiInbox, FiLayers, FiLogOut, FiMenu, FiMessageSquare, FiUser, FiX } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import { ToastProvider } from "@/components/admin/Toast"

type NavItem = { href: string, label: string, icon: IconType }

const navItems: NavItem[] = [
    { href: "/admin/projects", label: "Projects", icon: FiGrid },
    { href: "/admin/technologies", label: "Technologies", icon: FiLayers },
    { href: "/admin/testimonials", label: "Testimonials", icon: FiMessageSquare },
    { href: "/admin/experience", label: "Experience", icon: FiBriefcase },
    { href: "/admin/blog", label: "Blog", icon: FiEdit3 },
    { href: "/admin/about", label: "About page", icon: FiUser },
    { href: "/admin/gallery", label: "Gallery", icon: FiImage },
    { href: "/admin/project-form", label: "Project form", icon: FiClipboard },
    { href: "/admin/inquiries", label: "Inquiries", icon: FiInbox },
]

const INQUIRIES_HREF = "/admin/inquiries"

const itemBase = "relative flex items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
const itemState = (active: boolean) => (active ? "bg-white/6 text-white" : "text-muted hover:bg-white/4 hover:text-white")

function ActiveBar () {
    return <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-linear-to-b from-accent-1 to-accent-2" aria-hidden="true" />
}

function CountBadge ({ count, compact = false }: { count: number, compact?: boolean }) {
    if (count <= 0) return null
    const label = count > 99 ? "99+" : String(count)
    return compact
        ? <span className="absolute top-1 right-1 min-w-4 rounded-full bg-accent-1 px-1 text-center text-[10px] leading-4 font-bold text-white">{label}<span className="sr-only"> new</span></span>
        : <span className="ml-auto rounded-full bg-accent-1 px-2 py-0.5 text-[11px] leading-none font-bold text-white">{label}<span className="sr-only"> new</span></span>
}

export default function AdminShell ({ email, newInquiries = 0, children }: { email: string, newInquiries?: number, children: React.ReactNode }) {
    const pathname = usePathname()
    const [drawerOpen, setDrawerOpen] = React.useState(false)
    const [signingOut, setSigningOut] = React.useState(false)
    const [lastPathname, setLastPathname] = React.useState(pathname)
    const menuButtonRef = React.useRef<HTMLButtonElement>(null)
    const drawerRef = React.useRef<HTMLDivElement>(null)

    // Close the drawer whenever the route changes (adjusting state during render, not in an effect).
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setDrawerOpen(false)
    }

    const isActive = (href: string) => pathname.startsWith(href)

    // Drawer: lock page scroll, move focus in, trap Tab, close on Escape, restore focus on close.
    React.useEffect(() => {
        if (!drawerOpen) return
        const drawer = drawerRef.current
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        drawer?.querySelector<HTMLElement>("a, button")?.focus()

        function onKeyDown (event: KeyboardEvent) {
            if (event.key === "Escape") {
                setDrawerOpen(false)
                return
            }
            if (event.key !== "Tab" || !drawer) return
            const focusable = [...drawer.querySelectorAll<HTMLElement>("a, button:not([disabled])")]
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
        const menuButton = menuButtonRef.current
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener("keydown", onKeyDown)
            menuButton?.focus()
        }
    }, [drawerOpen])

    async function signOut () {
        setSigningOut(true)
        await adminFetch("/api/admin/auth/logout", { method: "POST" })
        window.location.assign("/admin/login")
    }

    const logo = (compact = false) => (
        <Link href="/admin/projects" aria-label="Rogers admin home" className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text font-extrabold uppercase text-transparent">
            {compact ? <span className="text-xl">R</span> : <span className="text-xl">Rogers <span className="text-sm font-semibold normal-case">admin</span></span>}
        </Link>
    )

    return (
        <ToastProvider>
            <div className="flex min-h-screen w-full">
                {/* ≥ lg: full sidebar */}
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-white/6 bg-card px-3 py-6 lg:flex">
                    <div className="flex flex-col gap-8">
                        <div className="px-4">{logo()}</div>
                        <nav className="flex flex-col gap-1" aria-label="Admin">
                            {navItems.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={`${itemBase} ${itemState(isActive(href))} gap-3 px-4 py-2.5`}>
                                    {isActive(href) && <ActiveBar />}
                                    <Icon aria-hidden="true" />
                                    {label}
                                    {href === INQUIRIES_HREF && <CountBadge count={newInquiries} />}
                                </Link>
                            ))}
                            <a href="/" target="_blank" rel="noopener noreferrer" className={`${itemBase} ${itemState(false)} gap-3 px-4 py-2.5`}>
                                <FiExternalLink aria-hidden="true" />
                                View site
                            </a>
                        </nav>
                    </div>
                    <div className="border-t border-white/6 pt-4">
                        <p className="truncate px-4 text-xs text-dim" title={email}>{email}</p>
                        <button type="button" onClick={signOut} disabled={signingOut} className={`${itemBase} ${itemState(false)} mt-2 w-full gap-3 px-4 py-2.5 disabled:opacity-50`}>
                            <FiLogOut aria-hidden="true" />
                            {signingOut ? "Signing out…" : "Sign out"}
                        </button>
                    </div>
                </aside>

                {/* md – lg: icon rail */}
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center justify-between border-r border-white/6 bg-card py-5 md:flex lg:hidden">
                    <div className="flex flex-col items-center gap-6">
                        {logo(true)}
                        <nav className="flex flex-col items-center gap-1.5" aria-label="Admin">
                            {navItems.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} aria-label={label} title={label} aria-current={isActive(href) ? "page" : undefined} className={`${itemBase} ${itemState(isActive(href))} size-11 justify-center text-lg`}>
                                    {isActive(href) && <ActiveBar />}
                                    <Icon aria-hidden="true" />
                                    {href === INQUIRIES_HREF && <CountBadge count={newInquiries} compact />}
                                </Link>
                            ))}
                            <a href="/" target="_blank" rel="noopener noreferrer" aria-label="View site" title="View site" className={`${itemBase} ${itemState(false)} size-11 justify-center text-lg`}>
                                <FiExternalLink aria-hidden="true" />
                            </a>
                        </nav>
                    </div>
                    <button type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out" title={`Sign out (${email})`} className={`${itemBase} ${itemState(false)} size-11 justify-center text-lg disabled:opacity-50`}>
                        <FiLogOut aria-hidden="true" />
                    </button>
                </aside>

                {/* < md: top bar + drawer */}
                <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/6 bg-card/95 px-4 backdrop-blur md:hidden">
                    {logo()}
                    <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-expanded={drawerOpen}
                        aria-controls="admin-drawer"
                        aria-label="Open menu"
                        className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-fg hover:bg-white/6"
                    >
                        <FiMenu size={22} aria-hidden="true" />
                    </button>
                </header>

                <div className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`} inert={!drawerOpen}>
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-label="Close menu"
                        onClick={() => setDrawerOpen(false)}
                        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
                    />
                    <div
                        id="admin-drawer"
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Admin menu"
                        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between border-r border-white/6 bg-card px-3 py-4 shadow-2xl transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
                    >
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between pl-4">
                                {logo()}
                                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-white/6 hover:text-white">
                                    <FiX size={22} aria-hidden="true" />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-1" aria-label="Admin">
                                {navItems.map(({ href, label, icon: Icon }) => (
                                    <Link key={href} href={href} onClick={() => setDrawerOpen(false)} aria-current={isActive(href) ? "page" : undefined} className={`${itemBase} ${itemState(isActive(href))} min-h-12 gap-3 px-4`}>
                                        {isActive(href) && <ActiveBar />}
                                        <Icon aria-hidden="true" />
                                        {label}
                                        {href === INQUIRIES_HREF && <CountBadge count={newInquiries} />}
                                    </Link>
                                ))}
                                <a href="/" target="_blank" rel="noopener noreferrer" className={`${itemBase} ${itemState(false)} min-h-12 gap-3 px-4`}>
                                    <FiExternalLink aria-hidden="true" />
                                    View site
                                </a>
                            </nav>
                        </div>
                        <div className="border-t border-white/6 pt-4">
                            <p className="truncate px-4 text-xs text-dim" title={email}>{email}</p>
                            <button type="button" onClick={signOut} disabled={signingOut} className={`${itemBase} ${itemState(false)} mt-2 min-h-12 w-full gap-3 px-4 disabled:opacity-50`}>
                                <FiLogOut aria-hidden="true" />
                                {signingOut ? "Signing out…" : "Sign out"}
                            </button>
                        </div>
                    </div>
                </div>

                <main className="w-full min-w-0 px-4 pt-20 pb-40 md:ml-16 md:px-8 md:pt-8 md:pb-32 lg:ml-60 lg:px-10 lg:pt-10">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>
            </div>
        </ToastProvider>
    )
}
