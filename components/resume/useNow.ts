"use client"

import * as React from "react"

// Current time rounded to the minute, updated every 30s (for "12 min ago" labels).
// Returns 0 during server render / hydration, so callers should treat 0 as "unknown".
const subscribe = (callback: () => void) => {
    const timer = setInterval(callback, 30_000)
    return () => clearInterval(timer)
}
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000
const getServerSnapshot = () => 0

export function useNow () {
    return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function relativeTime (iso: string, now: number) {
    const time = new Date(iso).getTime()
    if (!now || Number.isNaN(time)) return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    const minutes = Math.round((now - time) / 60_000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} h ago`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
