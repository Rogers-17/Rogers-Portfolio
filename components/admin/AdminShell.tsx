"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { IconType } from "react-icons"
import { FiBriefcase, FiClipboard, FiEdit3, FiExternalLink, FiFileText, FiGrid, FiImage, FiInbox, FiLayers, FiLogOut, FiMail, FiMenu, FiMessageSquare, FiTarget, FiUser, FiX } from "react-icons/fi"
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
    { href: "/admin/resumes", label: "Resumes", icon: FiFileText },
    { href: "/admin/cover-letters", label: "Cover letters", icon: FiMail },
    { href: "/admin/jobs", label: "Job tracker", icon: FiTarget },
    { href: "/admin/inquiries", label: "Inquiries", icon: FiInbox },
]

const INQUIRIES_HREF = "/admin/inquiries"
const JOBS_HREF = "/admin/jobs"

// Editors that need the full width of the screen.
const WIDE_ROUTES = /^\/admin\/(resumes|cover-letters)\/[^/]+$/

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"

function itemClass (active: boolean, variant: "full" | "rail") {
    const shape = variant === "rail" ? "size-11 justify-center" : "min-h-10 gap-3 px-3"
    const state = active
        ? "bg-linear-to-r from-accent-1/15 via-accent-2/8 to-transparent text-white"
        : "text-muted hover:bg-white/4 hover:text-white"
    return `group relative flex items-center rounded-xl text-sm font-medium transition-colors ${shape} ${state} ${focusRing}`
}

function ActiveBar () {
    return <span className="absolute inset-y-2 left-0 w-0.75 rounded-full bg-linear-to-b from-accent-1 to-accent-2" aria-hidden="true" />
}

function CountBadge ({ count, compact = false }: { count: number, compact?: boolean }) {
    if (count <= 0) return null
    const label = count > 99 ? "99+" : String(count)
    return compact
        ? <span className="absolute top-1 right-1 min-w-4 rounded-full bg-accent-1 px-1 text-center text-[10px] leading-4 font-bold text-white">{label}<span className="sr-only"> new</span></span>
        : <span className="ml-auto rounded-full bg-accent-1/90 px-2 py-0.5 text-[11px] leading-none font-bold text-white">{label}<span className="sr-only"> new</span></span>
}

type NavProps = { variant: "full" | "rail", isActive: (href: string) => boolean, newInquiries: number, dueFollowUps: number, onNavigate?: () => void }

// One list, rendered in the full sidebar, the icon rail and the phone drawer.
function NavLinks ({ variant, isActive, newInquiries, dueFollowUps, onNavigate }: NavProps) {
    return (
        <nav className={`flex flex-col gap-1 ${variant === "rail" ? "items-center" : ""}`} aria-label="Admin">
            {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        aria-label={variant === "rail" ? label : undefined}
                        title={variant === "rail" ? label : undefined}
                        className={itemClass(active, variant)}
                    >
                        {active && <ActiveBar />}
                        <Icon className={`shrink-0 transition-colors ${variant === "rail" ? "text-lg" : "text-[17px]"} ${active ? "text-accent-1" : "text-dim group-hover:text-white"}`} aria-hidden="true" />
                        {variant === "full" && <span className="truncate">{label}</span>}
                        {href === INQUIRIES_HREF && <CountBadge count={newInquiries} compact={variant === "rail"} />}
                        {href === JOBS_HREF && <CountBadge count={dueFollowUps} compact={variant === "rail"} />}
                    </Link>
                )
            })}
        </nav>
    )
}

export default function AdminShell ({ email, newInquiries = 0, dueFollowUps = 0, children }: { email: string, newInquiries?: number, dueFollowUps?: number, children: React.ReactNode }) {
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

    const isActive = (href: string) => pathname.startsWith(href) || (href === "/admin/resumes" && pathname.startsWith("/admin/resume-settings"))

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
        <Link href="/admin/projects" aria-label="Rogers admin home" className={`flex items-center gap-2 rounded-lg ${focusRing}`}>
            <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-xl font-extrabold text-transparent uppercase">{compact ? "R" : "Rogers"}</span>
            {!compact && <span className="rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Admin</span>}
        </Link>
    )

    const initial = (email.trim()[0] ?? "A").toUpperCase()

    // Account card: email, View site and Sign out.
    const account = (
        <div className="rounded-xl border border-white/6 bg-white/2 p-2">
            <div className="flex items-center gap-2.5 px-1.5 py-1">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 text-sm font-bold text-white" aria-hidden="true">{initial}</span>
                <p className="min-w-0 flex-1 truncate text-xs text-muted" title={email}>{email}</p>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
                <a href="/" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-muted hover:bg-white/6 hover:text-white ${focusRing}`}>
                    <FiExternalLink aria-hidden="true" /> View site
                </a>
                <button type="button" onClick={signOut} disabled={signingOut} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-muted hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 ${focusRing}`}>
                    <FiLogOut aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
                </button>
            </div>
        </div>
    )

    return (
        <ToastProvider>
            <div className="flex min-h-screen w-full">
                {/* ≥ lg: full sidebar */}
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-6 overflow-y-auto border-r border-white/6 bg-card px-3 py-5 lg:flex">
                    <div className="px-2 pt-1">{logo()}</div>
                    <div className="flex-1">
                        <NavLinks variant="full" isActive={isActive} newInquiries={newInquiries} dueFollowUps={dueFollowUps} />
                    </div>
                    {account}
                </aside>

                {/* md – lg: icon rail */}
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center gap-6 overflow-y-auto border-r border-white/6 bg-card py-5 md:flex lg:hidden">
                    {logo(true)}
                    <div className="flex-1">
                        <NavLinks variant="rail" isActive={isActive} newInquiries={newInquiries} dueFollowUps={dueFollowUps} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <a href="/" target="_blank" rel="noopener noreferrer" aria-label="View site" title="View site" className={itemClass(false, "rail")}>
                            <FiExternalLink className="text-lg" aria-hidden="true" />
                        </a>
                        <button type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out" title={`Sign out (${email})`} className={`${itemClass(false, "rail")} disabled:opacity-50`}>
                            <FiLogOut className="text-lg" aria-hidden="true" />
                        </button>
                    </div>
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
                        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto border-r border-white/6 bg-card px-3 py-4 shadow-2xl transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
                    >
                        <div className="flex items-center justify-between pl-2">
                            {logo()}
                            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-white/6 hover:text-white">
                                <FiX size={22} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <NavLinks variant="full" isActive={isActive} newInquiries={newInquiries} dueFollowUps={dueFollowUps} onNavigate={() => setDrawerOpen(false)} />
                        </div>
                        {account}
                    </div>
                </div>

                <main className="w-full min-w-0 px-4 pt-20 pb-40 md:ml-16 md:px-8 md:pt-8 md:pb-32 lg:ml-60 lg:px-10 lg:pt-10">
                    <div className={`mx-auto ${WIDE_ROUTES.test(pathname) ? "max-w-none" : "max-w-6xl"}`}>{children}</div>
                </main>
            </div>
        </ToastProvider>
    )
}
