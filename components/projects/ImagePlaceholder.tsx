export default function ImagePlaceholder ({ label }: { label: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-card" role="img" aria-label={`${label} (image coming soon)`}>
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,rgba(222,14,255,0.18),transparent_60%),radial-gradient(120%_120%_at_90%_100%,rgba(117,28,255,0.25),transparent_55%)]" />
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
            <span className="relative px-6 text-center text-2xl font-extrabold uppercase tracking-wide text-fg/80">{label}</span>
        </div>
    )
}
