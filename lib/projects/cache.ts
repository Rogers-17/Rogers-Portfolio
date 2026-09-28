export const PROJECTS_CACHE_TAG = "projects"

// Dev: near-instant so Supabase dashboard edits show on refresh. Prod: 60s safety net;
// admin saves expire the tag immediately (lib/admin/revalidate.ts).
export const PROJECTS_REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 1 : 60
