"use client"

import * as React from "react"

// Width of an element (0 until measured, which matches the server render). Layouts that
// depend on the space they actually have, e.g. after the dashboard sidebar collapses.
export function useContainerWidth<T extends HTMLElement> () {
    const ref = React.useRef<T>(null)
    const [width, setWidth] = React.useState(0)

    React.useEffect(() => {
        const element = ref.current
        if (!element) return
        const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    return [ref, width] as const
}
