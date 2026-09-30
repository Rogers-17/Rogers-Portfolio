"use client"

import * as React from "react"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extensions"
import type { IconType } from "react-icons"
import {
    LuBold, LuCode, LuHeading2, LuHeading3, LuImagePlus, LuItalic, LuLink, LuList, LuListOrdered,
    LuMinus, LuPilcrow, LuQuote, LuRedo2, LuSquareCode, LuStrikethrough, LuUnderline, LuUndo2, LuUnlink,
} from "react-icons/lu"
import { uploadImage } from "@/components/admin/ImageUpload"
import { isAllowedHref, type BlogDoc } from "@/lib/blog/content"

type Props = {
    value: BlogDoc
    onChange: (doc: BlogDoc) => void
    onError: (message: string) => void
    invalid?: boolean
}

// Tiptap editor limited to the same nodes/marks the site can render (lib/blog/content.ts).
// The editing surface uses the .blog-prose styles, so it looks like the published post.
export default function BlogEditor ({ value, onChange, onError, invalid }: Props) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: {
                    openOnClick: false,
                    autolink: true,
                    defaultProtocol: "https",
                    isAllowedUri: url => isAllowedHref(url),
                },
            }),
            Image.configure({ inline: false, allowBase64: false }),
            Placeholder.configure({ placeholder: "Start writing your post…" }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: "blog-prose min-h-96 px-4 py-5 focus:outline-none md:px-8 md:py-8",
                "aria-label": "Post body",
                role: "textbox",
                "aria-multiline": "true",
            },
        },
        onUpdate: ({ editor: current }) => onChange(current.getJSON() as BlogDoc),
    })

    return (
        <div className={`overflow-hidden rounded-xl border bg-surface ${invalid ? "border-rose-500" : "border-white/10 focus-within:border-accent-1"}`}>
            {editor ? <Toolbar editor={editor} onError={onError} /> : <div className="h-12 border-b border-white/8" />}
            <EditorContent editor={editor} className="[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-dim [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]" />
        </div>
    )
}

function ToolButton ({ icon: Icon, label, active, disabled, onClick }: { icon: IconType, label: string, active?: boolean, disabled?: boolean, onClick: () => void }) {
    return (
        <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-base transition-colors disabled:opacity-30 lg:size-9 ${active ? "bg-accent-1/20 text-white" : "text-muted hover:bg-white/6 hover:text-white"}`}
        >
            <Icon aria-hidden="true" />
        </button>
    )
}

const Divider = () => <span className="mx-1 h-6 w-px shrink-0 bg-white/10" aria-hidden="true" />

function Toolbar ({ editor, onError }: { editor: Editor, onError: (message: string) => void }) {
    const fileRef = React.useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = React.useState(false)

    const state = useEditorState({
        editor,
        selector: ({ editor: e }) => ({
            paragraph: e.isActive("paragraph"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            code: e.isActive("code"),
            link: e.isActive("link"),
            bulletList: e.isActive("bulletList"),
            orderedList: e.isActive("orderedList"),
            blockquote: e.isActive("blockquote"),
            codeBlock: e.isActive("codeBlock"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
        }),
    })

    const chain = () => editor.chain().focus()

    function setLink () {
        const previous = editor.getAttributes("link").href as string | undefined
        const input = window.prompt("Link URL (https://…, http://… or mailto:…)", previous ?? "https://")
        if (input === null) return
        const href = input.trim()
        if (!href) {
            chain().extendMarkRange("link").unsetLink().run()
            return
        }
        if (!isAllowedHref(href)) {
            onError("Links must start with https://, http:// or mailto:.")
            return
        }
        chain().extendMarkRange("link").setLink({ href }).run()
    }

    async function insertImage (file: File) {
        setUploading(true)
        const result = await uploadImage("site-images", "blog", file, 2000)
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ""
        if (!result.ok) {
            onError(result.error.message)
            return
        }
        const alt = window.prompt("Describe the image (alt text, required for accessibility):", "")?.trim()
        if (!alt) {
            onError("Image not added: a description is required.")
            return
        }
        chain().setImage({ src: result.data.url, alt: alt.slice(0, 200), width: result.data.width, height: result.data.height }).run()
    }

    return (
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b border-white/8 bg-card/95 px-2 py-1.5 backdrop-blur md:top-0" role="toolbar" aria-label="Formatting">
            <ToolButton icon={LuPilcrow} label="Paragraph" active={state.paragraph} onClick={() => chain().setParagraph().run()} />
            <ToolButton icon={LuHeading2} label="Heading 2" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
            <ToolButton icon={LuHeading3} label="Heading 3" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
            <Divider />
            <ToolButton icon={LuBold} label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()} />
            <ToolButton icon={LuItalic} label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()} />
            <ToolButton icon={LuUnderline} label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()} />
            <ToolButton icon={LuStrikethrough} label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()} />
            <ToolButton icon={LuCode} label="Inline code" active={state.code} onClick={() => chain().toggleCode().run()} />
            <ToolButton icon={LuLink} label="Add or edit link" active={state.link} onClick={setLink} />
            {state.link && <ToolButton icon={LuUnlink} label="Remove link" onClick={() => chain().extendMarkRange("link").unsetLink().run()} />}
            <Divider />
            <ToolButton icon={LuList} label="Bullet list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()} />
            <ToolButton icon={LuListOrdered} label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()} />
            <ToolButton icon={LuQuote} label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()} />
            <ToolButton icon={LuSquareCode} label="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()} />
            <ToolButton icon={LuMinus} label="Divider line" onClick={() => chain().setHorizontalRule().run()} />
            <ToolButton icon={LuImagePlus} label={uploading ? "Uploading image…" : "Insert image"} disabled={uploading} onClick={() => fileRef.current?.click()} />
            <Divider />
            <ToolButton icon={LuUndo2} label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()} />
            <ToolButton icon={LuRedo2} label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()} />
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label="Insert image"
                onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) void insertImage(file)
                }}
            />
        </div>
    )
}
