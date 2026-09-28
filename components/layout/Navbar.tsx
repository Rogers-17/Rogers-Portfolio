"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FaArrowRight } from "react-icons/fa"
import { LuMenu } from "react-icons/lu"
import Logo from "@/components/ui/Logo"
import MobileMenu from "@/components/layout/MobileMenu"
import NavDropdown from "@/components/layout/NavDropdown"
import { isItemActive } from "@/components/layout/nav-utils"
import { navItems, startProjectLink } from "@/utils/data"

const SCROLL_THRESHOLD = 8

function subscribeToScroll (onChange: () => void) {
    window.addEventListener("scroll", onChange, { passive: true })
    return () => window.removeEventListener("scroll", onChange)
}

// Transparent at the top of the page; dark and blurred once the page has scrolled.
function useScrolled () {
    return React.useSyncExternalStore(
        subscribeToScroll,
        () => window.scrollY > SCROLL_THRESHOLD,
        () => false,
    )
}

export default function Navbar () {
    const pathname = usePathname()
    const scrolled = useScrolled()
    const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)
    const [mobileOpen, setMobileOpen] = React.useState(false)
    const [lastPathname, setLastPathname] = React.useState(pathname)
    const menuButtonRef = React.useRef<HTMLButtonElement>(null)

    // Close any open menu on navigation (adjusting state during render, not in an effect).
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setOpenMenuId(null)
        setMobileOpen(false)
    }

    const closeMobile = React.useCallback(() => setMobileOpen(false), [])

    // The mobile menu renders outside <header>: the header's backdrop-filter would otherwise
    // become the containing block for the menu's position: fixed and clip it to 72px.
    return (
        <>
        <header
            className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${scrolled || openMenuId ? "border-white/6 bg-[#0b0614]/85 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl" : "border-transparent bg-transparent"}`}
        >
            <div className="mx-auto flex h-18 w-full items-center justify-between px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
                <Link href="/" aria-label="Rogers, home" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-1">
                    <Logo />
                </Link>

                <nav aria-label="Main" className="hidden lg:block">
                    <ul className="flex items-center gap-10">
                        {navItems.map(item => {
                            const active = isItemActive(pathname, item)
                            return (
                                <li key={item.kind === "link" ? item.href : item.id}>
                                    {item.kind === "link" ? (
                                        <Link
                                            href={item.href}
                                            aria-current={active ? "page" : undefined}
                                            className={`text-[15px] uppercase tracking-wide transition-colors duration-200 hover:text-accent-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-1 ${active ? "text-accent-1" : "text-white"}`}
                                        >
                                            {item.label}
                                        </Link>
                                    ) : (
                                        <NavDropdown
                                            item={item}
                                            pathname={pathname}
                                            active={active}
                                            isOpen={openMenuId === item.id}
                                            onOpenChange={isOpen => setOpenMenuId(isOpen ? item.id : null)}
                                        />
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                <Link
                    href={startProjectLink.href}
                    className="group hidden items-center gap-2 text-sm font-bold uppercase tracking-wide lg:flex"
                >
                    <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">{startProjectLink.label}</span>
                    <FaArrowRight size={11} className="text-accent-2 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>

                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-menu"
                    className="-mr-2 inline-flex h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold uppercase tracking-wide text-white lg:hidden"
                >
                    Menu
                    <LuMenu className="size-7" aria-hidden="true" />
                </button>
            </div>

        </header>
        <MobileMenu open={mobileOpen} pathname={pathname} onClose={closeMobile} returnFocusRef={menuButtonRef} />
        </>
    )
}
