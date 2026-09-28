"use client"

import * as React from "react"

type Toast = { id: number, message: string, tone: "success" | "error" }
type ToastContextValue = { notify: (message: string, tone?: Toast["tone"]) => void }

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider ({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([])
    const nextId = React.useRef(0)

    const notify = React.useCallback((message: string, tone: Toast["tone"] = "success") => {
        const id = ++nextId.current
        setToasts(current => [...current, { id, message, tone }])
        setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 4000)
    }, [])

    return (
        <ToastContext.Provider value={{ notify }}>
            {children}
            <div className="pointer-events-none fixed right-4 bottom-24 z-50 flex flex-col gap-2 md:bottom-6" aria-live="polite">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        role={toast.tone === "error" ? "alert" : "status"}
                        className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${toast.tone === "error" ? "border-rose-500/40 bg-rose-950/90 text-rose-100" : "border-emerald-500/40 bg-emerald-950/90 text-emerald-100"}`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast () {
    const context = React.useContext(ToastContext)
    if (!context) throw new Error("useToast must be used inside <ToastProvider>")
    return context
}
