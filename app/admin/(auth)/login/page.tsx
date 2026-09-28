import LoginForm from "@/components/admin/LoginForm"

type Props = { searchParams: Promise<{ next?: string, error?: string }> }

// Only allow redirects back into the admin area (prevents open redirects).
function safeNext (value: string | undefined) {
    if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) return "/admin/projects"
    return value
}

// Deliberately does no auth check or redirect: the login page must never bounce the
// browser elsewhere, so it can't take part in a redirect loop with the dashboard.
export default async function AdminLoginPage ({ searchParams }: Props) {
    const { next, error } = await searchParams

    return (
        <main className="flex min-h-screen w-full items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm rounded-2xl border border-white/6 bg-card p-8">
                <p className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-2xl font-extrabold uppercase text-transparent">Rogers</p>
                <h1 className="mt-4 text-2xl font-bold">Admin sign in</h1>
                <p className="mt-1 mb-7 text-sm text-muted">Manage projects and site content.</p>
                <LoginForm next={safeNext(next)} initialError={error === "forbidden" ? "This account doesn't have admin access." : undefined} />
            </div>
        </main>
    )
}
