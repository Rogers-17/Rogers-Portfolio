// The gradient-border pill used above page headings.
export default function Badge ({ children }: { children: React.ReactNode }) {
    return (
        <p className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-4 py-2 text-sm font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box] md:px-5 md:py-2.5">
            {children}
        </p>
    )
}
