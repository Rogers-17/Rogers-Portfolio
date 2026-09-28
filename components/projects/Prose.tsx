// Renders plain text as paragraphs (blank line = new paragraph). No HTML is ever interpreted.
export default function Prose ({ text, className = "" }: { text: string, className?: string }) {
    const paragraphs = text.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean)

    return (
        <div className={`flex flex-col gap-5 ${className}`}>
            {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
    )
}
