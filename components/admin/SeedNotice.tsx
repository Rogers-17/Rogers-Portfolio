// Shown when a page's content row hasn't been created yet (seed not run): saving would fail.
export default function SeedNotice ({ show }: { show: boolean }) {
    if (!show) return null
    return (
        <p role="alert" className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            This page&rsquo;s content row doesn&rsquo;t exist yet, so saving will fail. Run <code className="font-mono text-xs">supabase/seed_about_gallery_project_form.sql</code> in the Supabase SQL Editor, then reload.
        </p>
    )
}
