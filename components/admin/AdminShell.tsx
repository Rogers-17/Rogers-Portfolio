"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FiExternalLink, FiGrid, FiLayers, FiLogOut, FiMenu, FiX } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import { ToastProvider } from "@/components/admin/Toast"

const navItems = [
    { href: "/admin/projects", label: "Projects", icon: FiGrid },
    { href: "/admin/technologies", label: "Technologies", icon: FiLayers },
]

export default function AdminShell ({ email, children }: { email: string, children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [menuOpen, setMenuOpen] = React.useState(false)
    const [signingOut, setSigningOut] = React.useState(false)

    async function signOut () {
        setSigningOut(true)
        await adminFetch("/api/admin/auth/logout", { method: "POST" })
        router.replace("/admin/login")
        router.refresh()
    }

    const nav = (
        <nav className="flex flex-col gap-1" aria-label="Admin">
            {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-white/6 text-white" : "text-muted hover:bg-white/4 hover:text-white"}`}
                    >
                        {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-linear-to-b from-accent-1 to-accent-2" aria-hidden="true" />}
                        <Icon aria-hidden="true" />
                        {label}
                    </Link>
                )
            })}
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-white/4 hover:text-white">
                <FiExternalLink aria-hidden="true" />
                View site
            </a>
        </nav>
    )

    const footer = (
        <div className="border-t border-white/6 pt-4">
            <p className="truncate px-4 text-xs text-dim" title={email}>{email}</p>
            <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-white/4 hover:text-white disabled:opacity-50"
            >
                <FiLogOut aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
            </button>
        </div>
    )

    const logo = (
        <Link href="/admin/projects" className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-xl font-extrabold uppercase text-transparent">
            Rogers <span className="text-sm font-semibold normal-case">admin</span>
        </Link>
    )

    return (
        <ToastProvider>
            <div className="flex min-h-screen w-full">
                <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-white/6 bg-card px-3 py-6 lg:flex">
                    <div className="flex flex-col gap-8">
                        <div className="px-4">{logo}</div>
                        {nav}
                    </div>
                    {footer}
                </aside>

                <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/6 bg-card px-4 lg:hidden">
                    {logo}
                    <button type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label="Toggle menu" className="p-2">
                        {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                    </button>
                </div>
                {menuOpen && (
                    <div className="fixed inset-x-0 top-14 z-40 flex flex-col gap-4 border-b border-white/6 bg-card p-3 lg:hidden">
                        {nav}
                        {footer}
                    </div>
                )}

                <main className="w-full min-w-0 px-4 pt-20 pb-32 lg:ml-60 lg:px-10 lg:pt-10">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>
            </div>
        </ToastProvider>
    )
}
