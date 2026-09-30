import * as React from "react"
import Image from "next/image"
import { isAllowedHref, isAllowedImageSrc, type BlogMark, type BlogNode } from "@/lib/blog/content"

// Renders sanitized Tiptap JSON with fixed React elements. Only allowlisted node and mark
// types produce output; text is React text and attributes come from validated values only.
// The markup mirrors what the editor produces, so the shared .blog-prose styles look the same.

function isExternal (href: string) {
    return /^https?:\/\//i.test(href)
}

function applyMarks (text: React.ReactNode, marks: BlogMark[] = [], key: string): React.ReactNode {
    return marks.reduce<React.ReactNode>((child, mark, index) => {
        const markKey = `${key}-${index}`
        switch (mark.type) {
            case "bold": return <strong key={markKey}>{child}</strong>
            case "italic": return <em key={markKey}>{child}</em>
            case "underline": return <u key={markKey}>{child}</u>
            case "strike": return <s key={markKey}>{child}</s>
            case "code": return <code key={markKey}>{child}</code>
            case "link":
                if (!isAllowedHref(mark.attrs.href)) return child
                return isExternal(mark.attrs.href)
                    ? <a key={markKey} href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow">{child}</a>
                    : <a key={markKey} href={mark.attrs.href}>{child}</a>
            default: return child
        }
    }, text)
}

function renderChildren (nodes: BlogNode[] | undefined, key: string) {
    return nodes?.map((child, index) => renderNode(child, `${key}.${index}`))
}

function renderNode (node: BlogNode, key: string): React.ReactNode {
    switch (node.type) {
        case "doc": return renderChildren(node.content, key)
        case "text": return <React.Fragment key={key}>{applyMarks(node.text, node.marks, key)}</React.Fragment>
        case "paragraph": return <p key={key}>{renderChildren(node.content, key)}</p>
        case "heading": return node.attrs.level === 3
            ? <h3 key={key}>{renderChildren(node.content, key)}</h3>
            : <h2 key={key}>{renderChildren(node.content, key)}</h2>
        case "hardBreak": return <br key={key} />
        case "bulletList": return <ul key={key}>{renderChildren(node.content, key)}</ul>
        case "orderedList": return <ol key={key} start={node.attrs.start > 1 ? node.attrs.start : undefined}>{renderChildren(node.content, key)}</ol>
        case "listItem": return <li key={key}>{renderChildren(node.content, key)}</li>
        case "blockquote": return <blockquote key={key}>{renderChildren(node.content, key)}</blockquote>
        case "codeBlock": return (
            <pre key={key}>
                <code data-language={node.attrs.language ?? undefined}>{node.content?.map(child => (child.type === "text" ? child.text : "")).join("")}</code>
            </pre>
        )
        case "horizontalRule": return <hr key={key} />
        case "image": {
            const { src, alt, width, height } = node.attrs
            if (!isAllowedImageSrc(src)) return null
            return width && height
                ? <Image key={key} src={src} alt={alt} width={width} height={height} sizes="(min-width: 768px) 640px, 100vw" />
                : <Image key={key} src={src} alt={alt} width={1600} height={1000} sizes="(min-width: 768px) 640px, 100vw" className="h-auto" />
        }
        default: return null
    }
}

export default function RichText ({ doc, className = "" }: { doc: BlogNode, className?: string }) {
    return <div className={`blog-prose ${className}`}>{renderNode(doc, "n")}</div>
}
