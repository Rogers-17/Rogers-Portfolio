import "server-only"
import type { StorageBucket } from "@/lib/storage"

export type ImageKind = { ext: "png" | "jpg" | "webp" | "avif" | "gif" | "svg", mime: string }

export const BUCKET_RULES: Record<StorageBucket, { maxBytes: number, allowed: ImageKind["ext"][] }> = {
    "project-images": { maxBytes: 5 * 1024 * 1024, allowed: ["png", "jpg", "webp", "avif", "gif"] },
    "tech-icons": { maxBytes: 1024 * 1024, allowed: ["svg", "png", "webp"] },
    "site-images": { maxBytes: 2 * 1024 * 1024, allowed: ["png", "jpg", "webp", "avif"] },
    "resume-assets": { maxBytes: 5 * 1024 * 1024, allowed: ["png", "jpg", "webp"] },
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte)

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))

// Detects the real type from file contents; the client-provided MIME type is never trusted.
export function sniffImage (bytes: Uint8Array): ImageKind | null {
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" }
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" }
    if (ascii(bytes, 0, 4) === "GIF8") return { ext: "gif", mime: "image/gif" }
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" }
    if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return { ext: "avif", mime: "image/avif" }
    if (isSvg(bytes)) return { ext: "svg", mime: "image/svg+xml" }
    return null
}

function isSvg (bytes: Uint8Array) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 4096))
    const withoutPreamble = text
        .replace(/^﻿/, "")
        .replace(/<\?xml[\s\S]*?\?>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<!DOCTYPE[^>]*>/gi, "")
        .trimStart()
    return /^<svg[\s>]/i.test(withoutPreamble)
}

// SVGs can carry scripts; reject anything active rather than trying to sanitize it.
export function isUnsafeSvg (bytes: Uint8Array) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    return /<script|<foreignObject|<!ENTITY|javascript:|data:text\/html|\son[a-z]+\s*=/i.test(text)
}
