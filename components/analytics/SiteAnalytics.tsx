"use client"

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next"

// /d/<token> and /r/<token> are bearer share links: anyone with the URL can open the file.
const SHARE_PATH = /^\/(d|r)\/[^/]+(\/.*)?$/

// Drops admin traffic and redacts share tokens so they never reach Vercel.
function beforeSend (event: BeforeSendEvent): BeforeSendEvent | null {
    let url: URL
    try {
        url = new URL(event.url)
    } catch {
        return null
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return null

    const share = SHARE_PATH.exec(url.pathname)
    if (share) {
        url.pathname = `/${share[1]}/[token]${share[2] ?? ""}`
        url.search = ""
        url.hash = ""
        return { ...event, url: url.toString() }
    }

    return event
}

export default function SiteAnalytics () {
    return <Analytics beforeSend={beforeSend} />
}
