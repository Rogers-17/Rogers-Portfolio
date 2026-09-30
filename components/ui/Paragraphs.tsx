import { emphasisSegments, splitParagraphs } from "@/lib/pages/schema"

// Renders admin-entered text: blank lines split paragraphs, **bold** becomes <strong>.
// Everything is React text, never HTML.
export function Emphasis ({ text }: { text: string }) {
    return emphasisSegments(text).map((segment, index) =>
        segment.bold
            ? <strong key={index} className="font-semibold text-fg">{segment.text}</strong>
            : <span key={index}>{segment.text}</span>)
}

export default function Paragraphs ({ text, className = "" }: { text: string, className?: string }) {
    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {splitParagraphs(text).map((paragraph, index) => <p key={index}><Emphasis text={paragraph} /></p>)}
        </div>
    )
}
