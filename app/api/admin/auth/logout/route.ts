import { createSessionClient } from "@/lib/supabase/session"
import { isSameOrigin } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"

export async function POST (request: Request) {
    if (!isSameOrigin(request)) return fail(403, "forbidden_origin", "Cross-origin request blocked.")

    const supabase = await createSessionClient()
    await supabase.auth.signOut()
    return ok({ signedOut: true })
}
