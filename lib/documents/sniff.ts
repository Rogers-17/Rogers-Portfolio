import "server-only"
import { sniffImage } from "@/lib/admin/uploads"
import type { DocumentFormat } from "@/lib/documents/schema"

// Detects a document's real format from its contents and checks it against the extension.
// Returns the format to store, or null when the contents don't match. Never trusts the MIME
// type the browser sent.

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
const isZip = (bytes: Uint8Array) => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])

// File names inside a ZIP are stored uncompressed, so a plain byte search finds them.
const zipContains = (bytes: Uint8Array, name: string) =>
    Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(name, 0, "latin1")

function officeKind (bytes: Uint8Array): "docx" | "xlsx" | "pptx" | null {
    if (!isZip(bytes) || !zipContains(bytes, "[Content_Types].xml")) return null
    if (zipContains(bytes, "word/")) return "docx"
    if (zipContains(bytes, "xl/")) return "xlsx"
    if (zipContains(bytes, "ppt/")) return "pptx"
    return null
}

function isPlainText (bytes: Uint8Array) {
    if (bytes.includes(0)) return false
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        return true
    } catch {
        return false
    }
}

export function sniffDocument (bytes: Uint8Array, declared: DocumentFormat): boolean {
    switch (declared) {
        case "pdf":
        case "png":
        case "jpg":
        case "webp":
            return sniffImage(bytes)?.ext === declared
        case "docx":
        case "xlsx":
        case "pptx":
            return officeKind(bytes) === declared
        case "doc":
        case "xls":
            return startsWith(bytes, OLE)
        case "zip":
            return isZip(bytes)
        case "txt":
        case "csv":
        case "md":
            return isPlainText(bytes)
    }
}
