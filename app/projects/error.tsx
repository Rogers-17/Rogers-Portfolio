"use client"

export default function ProjectsError ({ unstable_retry }: { error: Error & { digest?: string }, unstable_retry: () => void }) {
    return (
        <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-5 py-32 text-center">
            <h1 className="text-3xl font-bold">Couldn&apos;t load projects</h1>
            <p className="text-muted">Something went wrong while fetching this page. Please try again.</p>
            <button
                type="button"
                onClick={() => unstable_retry()}
                className="rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:border-accent-1"
            >
                Try again
            </button>
        </main>
    )
}
