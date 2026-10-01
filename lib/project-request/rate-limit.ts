import "server-only"
import { createHmac } from "node:crypto"

let warned = false

// The IP is only ever stored as a keyed SHA-256 hash (used for per-visitor rate limiting).
function salt () {
    const value = process.env.RATE_LIMIT_SALT
    if (value && value.length >= 32) return value
    if (!warned) {
        console.warn("[project-requests] RATE_LIMIT_SALT is missing or shorter than 32 characters; using a fallback salt. Set it in the environment.")
        warned = true
    }
    return "rogers-portfolio-fallback-rate-limit-salt"
}

export function clientIp (request: Request) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
}

export function hashIp (request: Request) {
    return createHmac("sha256", salt()).update(clientIp(request)).digest("hex")
}

// Same hash from a Headers object (Server Components use next/headers, not a Request).
export function hashIpFromHeaders (headers: Headers) {
    return hashIp({ headers } as Request)
}
