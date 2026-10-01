import { LuFile, LuFileArchive, LuFileImage, LuFileSpreadsheet, LuFileText, LuPresentation } from "react-icons/lu"
import type { IconType } from "react-icons"
import type { DocumentFormat } from "@/lib/documents/schema"

// Colour-coded tile for a document format: PDF rose, image sky, Word blue, Excel emerald,
// PowerPoint amber, text slate, ZIP violet.
const KINDS: Record<string, { icon: IconType, tile: string }> = {
    pdf: { icon: LuFileText, tile: "bg-rose-500/14 text-rose-300" },
    image: { icon: LuFileImage, tile: "bg-sky-500/14 text-sky-300" },
    word: { icon: LuFileText, tile: "bg-blue-500/16 text-blue-300" },
    excel: { icon: LuFileSpreadsheet, tile: "bg-emerald-500/14 text-emerald-300" },
    powerpoint: { icon: LuPresentation, tile: "bg-amber-400/14 text-amber-200" },
    text: { icon: LuFileText, tile: "bg-slate-400/14 text-slate-300" },
    zip: { icon: LuFileArchive, tile: "bg-violet-500/16 text-violet-300" },
    unknown: { icon: LuFile, tile: "bg-white/8 text-muted" },
}

function kindOf (format: DocumentFormat | null) {
    switch (format) {
        case "pdf": return "pdf"
        case "png": case "jpg": case "webp": return "image"
        case "docx": case "doc": return "word"
        case "xlsx": case "xls": case "csv": return "excel"
        case "pptx": return "powerpoint"
        case "txt": case "md": return "text"
        case "zip": return "zip"
        default: return "unknown"
    }
}

const SIZES = {
    sm: "size-9 rounded-lg text-base",
    md: "size-11 rounded-xl text-lg",
    lg: "size-16 rounded-2xl text-2xl",
}

export default function FileTypeIcon ({ format, size = "md" }: { format: DocumentFormat | null, size?: keyof typeof SIZES }) {
    const { icon: Icon, tile } = KINDS[kindOf(format)]
    return (
        <span className={`relative inline-flex shrink-0 flex-col items-center justify-center ${SIZES[size]} ${tile}`} aria-hidden="true">
            <Icon />
            {size !== "sm" && format && <span className="mt-0.5 text-[9px] leading-none font-bold tracking-wide uppercase">{format}</span>}
        </span>
    )
}
