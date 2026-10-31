import Link from "next/link"

// Shown by public share links that can't open. Every failure looks the same to the visitor.
export default function LinkUnavailable ({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-surface px-5 text-center">
            <div className="max-w-sm">
                <p className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-xl font-extrabold text-transparent uppercase">Rogers</p>
                <h1 className="mt-4 text-2xl font-bold">Link unavailable</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
                <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/12 px-6 text-sm font-semibold hover:border-accent-1">Visit the portfolio</Link>
            </div>
        </main>
    )
}
