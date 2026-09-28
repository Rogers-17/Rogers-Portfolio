export default function DetailSection ({ id, title, children }: { id?: string, title: string, children: React.ReactNode }) {
    return (
        <section id={id} className="grid scroll-mt-24 gap-6 py-14 md:grid-cols-2 md:gap-16 md:py-20">
            <h2 className="text-3xl font-bold leading-tight md:text-[2.5rem]">{title}</h2>
            <div className="min-w-0">{children}</div>
        </section>
    )
}
