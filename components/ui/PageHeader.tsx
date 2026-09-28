type Props = {
    badge: string
    title: string
    highlight: string
    intro?: string
    children?: React.ReactNode
}

// Page-level header in the same language as the homepage section headers.
export default function PageHeader ({ badge, title, highlight, intro, children }: Props) {
    return (
        <header className="pt-10 md:pt-16">
            <p className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">
                {badge}
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:mt-7 md:text-6xl">
                {title}
                <br />
                <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">{highlight}</span>
            </h1>
            {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted md:mt-6">{intro}</p>}
            {children}
        </header>
    )
}
