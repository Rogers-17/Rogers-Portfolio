import type { Metadata } from "next"

export const metadata: Metadata = {
    // "%s" stops the public "| Mohammed N. Rogers" template from reaching admin page titles.
    title: { absolute: "Admin | Rogers Portfolio", template: "%s" },
    description: null,
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false },
}

export default function AdminLayout ({ children }: { children: React.ReactNode }) {
    return children
}
