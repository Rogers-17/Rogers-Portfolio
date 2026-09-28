import type { IconType } from "react-icons"

export type NavLink = { label: string, href: string }

export type NavItem =
    | { kind: "link", label: string, href: string, icon: IconType }
    | { kind: "menu", id: string, label: string, icon: IconType, children: NavLink[] }
