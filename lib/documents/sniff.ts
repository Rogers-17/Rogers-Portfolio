import "server-only"
import { sniffImage } from "@/lib/admin/uploads"
import type { DocumentFormat } from "@/lib/documents/schema"

// Checks a document's real format against its extension, from the first and last 64 KB of the
// file (large files are never downloaded in full). Never trusts the MIME type the browser sent.
//   head: the first bytes of the file
//   tail: the last bytes (empty when head already covers the whole file)
//   truncated: true when head stops before the end of the file

export type DocumentSample = { head: Uint8Array, tail: Uint8Array, truncated: boolean }

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
const isZip = (bytes: Uint8Array) => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])

// File names inside a ZIP are stored uncompressed, both in each entry's header and in the
// index at the end of the file, so a plain byte search of the head or tail finds them.
const contains = (bytes: Uint8Array, name: string) =>
    bytes.byteLength > 0 && Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(name, 0, "latin1")

function officeKind ({ head, tail }: DocumentSample): "docx" | "xlsx" | "pptx" | null {
    const has = (name: string) => contains(head, name) || contains(tail, name)
    if (!isZip(head) || !has("[Content_Types].xml")) return null
    if (has("word/")) return "docx"
    if (has("xl/")) return "xlsx"
    if (has("ppt/")) return "pptx"
    return null
}

function isPlainText ({ head, truncated }: DocumentSample) {
    if (head.includes(0)) return false
    try {
        // stream: a character cut in half at the end of a partial sample is not an error.
        new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: truncated })
        return true
    } catch {
        return false
    }
}

export function sniffDocument (sample: DocumentSample, declared: DocumentFormat): boolean {
    switch (declared) {
        case "pdf":
        case "png":
        case "jpg":
        case "webp":
            return sniffImage(sample.head)?.ext === declared
        case "docx":
        case "xlsx":
        case "pptx":
            return officeKind(sample) === declared
        case "doc":
        case "xls":
            return startsWith(sample.head, OLE)
        case "zip":
            return isZip(sample.head)
        case "txt":
        case "csv":
        case "md":
            return isPlainText(sample)
    }
}
