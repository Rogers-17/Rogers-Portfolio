import type { NavItem } from "@/types/type"

// "/" only matches exactly; other links also match their sub-routes.
export function isLinkActive (pathname: string, href: string): boolean {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function isItemActive (pathname: string, item: NavItem): boolean {
    return item.kind === "link"
        ? isLinkActive(pathname, item.href)
        : item.children.some(child => isLinkActive(pathname, child.href))
}
