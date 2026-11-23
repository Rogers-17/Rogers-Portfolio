import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { aboutFactsConfig, createContent, deleteContent, experiencesConfig, galleryPhotosConfig, testimonialsConfig, toggleContent, updateContent, type ContentConfig } from "@/lib/admin/actions/content"
import { createTechnology, deleteProject, deleteTechnology, saveProject, toggleProject, updateTechnology } from "@/lib/admin/actions/projects"
import { createJob, createPost, deleteInquiry, deleteJob, deletePost, updateInquiry, updateJob, updatePost, type InquiryUpdate } from "@/lib/admin/actions/records"
import { failure, type ActionResult } from "@/lib/admin/actions/result"
import { aboutPageConfig, blogPageConfig, galleryPageConfig, projectFormConfig, updateSingleton, type SingletonConfig } from "@/lib/admin/actions/singletons"
import { getPostForAdmin, listPostsForAdmin } from "@/lib/admin/blog-queries"
import { blogPostInputSchema, POST_STATUSES, type BlogPostInput } from "@/lib/admin/blog-schemas"
import type { AdminExperience, AdminTestimonial } from "@/lib/admin/content-queries"
import { projectRequestUpdateSchema } from "@/lib/admin/page-schemas"
import type { AdminAboutFact, AdminGalleryPhoto } from "@/lib/admin/page-queries"
import { getProjectForAdmin, listProjectsForAdmin, listTechnologiesForAdmin } from "@/lib/admin/queries"
import { projectInputSchema, technologyInputSchema, type ProjectInput, type TechnologyInput } from "@/lib/admin/schemas"
import { toPlainText, type BlogDoc } from "@/lib/blog/content"
import { getJob, listJobs } from "@/lib/jobs/queries"
import { JOB_STATUSES, jobInputSchema, type JobInput } from "@/lib/jobs/schema"
import { FACT_ICONS } from "@/lib/pages/schema"
import { REQUEST_STATUSES } from "@/lib/project-request/schema"
import { PROJECT_STATUSES } from "@/lib/projects/shared"
import { docToMarkdown, markdownToDoc } from "@/lib/agent/markdown"
import { AGENT_TYPES } from "@/lib/agent/schemas"

export type ContentType = (typeof AGENT_TYPES)[number]

// One adapter per admin content type: what the assistant may read, which fields it may
// change, and which shared admin action performs the write. Image/storage paths are never
// agent-editable: they are always carried over from the current record.

type Row = Record<string, unknown>
type Prepared = { ok: true, changes: Row } | { ok: false, message: string }

export type Adapter = {
    label: string
    about: string
    singleton?: boolean
    // Agent-facing editable fields (all optional; omitted = keep current value).
    fields?: z.ZodObject<z.ZodRawShape>
    canCreate?: boolean
    defaults?: Row
    toggles?: readonly string[]
    inputSchema: z.ZodType<Row>
    list: (supabase: SupabaseClient) => Promise<Row[]>
    view: (supabase: SupabaseClient, id: string | null) => Promise<Row | null>
    // Current record in the input-schema shape, used as the base for partial updates.
    base: (supabase: SupabaseClient, id: string | null) => Promise<Row | null>
    prepare?: (supabase: SupabaseClient, changes: Row, base: Row) => Promise<Prepared>
    display?: (supabase: SupabaseClient, input: Row) => Promise<Row>
    name: (record: Row) => string
    save?: (supabase: SupabaseClient, id: string | null, input: Row) => Promise<ActionResult<unknown>>
    toggle?: (supabase: SupabaseClient, id: string, field: string, value: boolean) => Promise<ActionResult<unknown>>
    remove?: (supabase: SupabaseClient, id: string) => Promise<ActionResult<unknown>>
}

// ---------------------------------------------------------------------------
// Field helpers (plain Zod, Gemini-friendly: no unions, transforms or recursion)
// ---------------------------------------------------------------------------

const text = (description: string) => z.string().optional().describe(description)
const flag = (description: string) => z.boolean().optional().describe(description)
const int = (description: string) => z.number().optional().describe(`${description} Whole number.`)
const strings = (description: string) => z.array(z.string()).optional().describe(description)
const CLEAR = "Empty string clears it."

const truncate = (value: unknown, max: number) => (typeof value === "string" && value.length > max ? `${value.slice(0, max)}…` : value)

function pick (row: Row | null | undefined, keys: string[]): Row | null {
    if (!row) return null
    return Object.fromEntries(keys.filter(key => key in row).map(key => [key, row[key]]))
}

// Months and ratings use 0 to mean "clear".
function zeroToNull (changes: Row, keys: string[]): Row {
    const next = { ...changes }
    for (const key of keys) if (next[key] === 0) next[key] = null
    return next
}

// ---------------------------------------------------------------------------
// Flat content tables
// ---------------------------------------------------------------------------

function contentAdapter (config: ContentConfig, options: Omit<Adapter, "inputSchema" | "view" | "base" | "save" | "toggle" | "remove" | "list"> & {
    listRow: (row: Row) => Row
    keys: string[]
}): Adapter {
    const { listRow, keys, ...rest } = options
    return {
        ...rest,
        inputSchema: config.inputSchema,
        toggles: ["is_published"],
        list: async supabase => (await config.list(supabase) as Row[]).map(listRow),
        view: async (supabase, id) => pick(id ? await config.get(supabase, id) as Row | null : null, ["id", ...keys]),
        base: async (supabase, id) => (id ? await config.get(supabase, id) as Row | null : null),
        save: (supabase, id, input) => (id ? updateContent(supabase, config, id, input) : createContent(supabase, config, input)),
        toggle: (supabase, id, _field, value) => toggleContent(supabase, config, id, value),
        remove: (supabase, id) => deleteContent(supabase, config, id),
    }
}

const testimonial = contentAdapter(testimonialsConfig, {
    label: "Testimonial",
    about: "Client testimonials shown on the site.",
    canCreate: true,
    defaults: { quote: "", author_name: "", author_role: null, avatar_path: null, rating: null, is_published: true },
    fields: z.object({
        quote: text("The testimonial text (max 1000 chars)."),
        author_name: text("Who said it."),
        author_role: text(`Their role and company, e.g. "CTO, Acme". ${CLEAR}`),
        rating: int("Star rating 1-5. 0 clears it."),
        is_published: flag("Visible on the public site."),
    }),
    prepare: async (_supabase, changes) => ({ ok: true, changes: zeroToNull(changes, ["rating"]) }),
    keys: ["quote", "author_name", "author_role", "rating", "is_published", "avatar_path"],
    listRow: row => {
        const item = row as AdminTestimonial
        return { id: item.id, author_name: item.author_name, author_role: item.author_role, rating: item.rating, is_published: item.is_published, quote: truncate(item.quote, 80) }
    },
    name: row => String(row.author_name ?? "Testimonial"),
})

const experience = contentAdapter(experiencesConfig, {
    label: "Experience",
    about: "Work experience entries (resume timeline).",
    canCreate: true,
    defaults: { role: "", company: "", company_url: null, logo_path: null, location: null, start_year: undefined, start_month: null, end_year: null, end_month: null, is_current: false, description: null, skills: [], is_published: true },
    fields: z.object({
        role: text("Job title."),
        company: text("Company name."),
        company_url: text(`Company website, full https:// URL. ${CLEAR}`),
        location: text(`City/country or "Remote". ${CLEAR}`),
        start_year: int("Start year, e.g. 2023."),
        start_month: int("Start month 1-12. 0 clears it."),
        end_year: int("End year. Not needed when is_current is true."),
        end_month: int("End month 1-12. 0 clears it."),
        is_current: flag("True if this is the current job (clears the end date)."),
        description: text(`Short description (max 2000 chars). ${CLEAR}`),
        skills: strings("Skills/technologies, max 20. Replaces the whole list."),
        is_published: flag("Visible on the public site."),
    }),
    prepare: async (_supabase, changes) => ({ ok: true, changes: zeroToNull(changes, ["start_month", "end_month"]) }),
    keys: ["role", "company", "company_url", "location", "start_year", "start_month", "end_year", "end_month", "is_current", "description", "skills", "is_published", "logo_path"],
    listRow: row => {
        const item = row as AdminExperience
        return { id: item.id, role: item.role, company: item.company, period: item.period, is_current: item.is_current, is_published: item.is_published }
    },
    name: row => `${row.role ?? "Role"} at ${row.company ?? "company"}`,
})

const aboutFact = contentAdapter(aboutFactsConfig, {
    label: "About fact",
    about: "Fact cards on the About page.",
    canCreate: true,
    defaults: { icon: "star", title: "", body: "", is_published: true },
    fields: z.object({
        icon: z.enum(FACT_ICONS).optional().describe("Icon for the card."),
        title: text("Card title (max 60 chars)."),
        body: text("Card text (max 2000 chars)."),
        is_published: flag("Visible on the public site."),
    }),
    keys: ["icon", "title", "body", "is_published"],
    listRow: row => {
        const item = row as AdminAboutFact
        return { id: item.id, title: item.title, icon: item.icon, is_published: item.is_published }
    },
    name: row => String(row.title ?? "Fact"),
})

const galleryPhoto = contentAdapter(galleryPhotosConfig, {
    label: "Gallery photo",
    about: "Photos on the Gallery page. New photos must be uploaded in the admin; only text and visibility can change here.",
    fields: z.object({
        alt: text("Image description for accessibility (max 200 chars)."),
        caption: text(`Caption under the photo (max 200 chars). ${CLEAR}`),
        is_published: flag("Visible on the public site."),
    }),
    keys: ["alt", "caption", "is_published", "image_path"],
    listRow: row => {
        const item = row as AdminGalleryPhoto
        return { id: item.id, alt: item.alt, caption: item.caption, is_published: item.is_published }
    },
    name: row => String(row.alt ?? "Photo"),
})

// ---------------------------------------------------------------------------
// Projects and technologies
// ---------------------------------------------------------------------------

const PROJECT_KEYS = ["name", "slug", "tagline", "summary", "project_type", "niche", "year", "client", "role", "status", "website_url", "cover_image_path", "cover_image_alt", "overview", "problem", "solution", "dev_role", "monetization", "tech_intro", "project_summary", "is_published", "is_featured", "features", "gallery", "tech_breakdown", "technology_ids"]

const project: Adapter = {
    label: "Project",
    about: "Portfolio projects (name, niche, year, stack, links, case-study sections).",
    canCreate: true,
    inputSchema: projectInputSchema,
    toggles: ["is_published", "is_featured"],
    defaults: {
        name: "", slug: "", tagline: "", summary: "", project_type: "", niche: null, year: new Date().getFullYear(), client: null, role: null,
        status: "active", website_url: null, cover_image_path: null, cover_image_alt: null, overview: null, problem: null, solution: null,
        dev_role: null, monetization: null, tech_intro: null, project_summary: null, is_published: false, is_featured: false,
        features: [], gallery: [], tech_breakdown: [], technology_ids: [],
    },
    fields: z.object({
        name: text("Project name (max 80 chars)."),
        slug: text("URL slug, lowercase-kebab-case, unique."),
        tagline: text("One-line tagline (max 200 chars)."),
        summary: text("Short summary for cards (max 280 chars)."),
        project_type: text('Type, e.g. "Web app", "Mobile app", "Website" (max 40 chars).'),
        niche: text(`Industry/niche, e.g. "Fintech". ${CLEAR}`),
        year: int("Year, 2000-2100."),
        client: text(`Client name. ${CLEAR}`),
        role: text(`Rogers' role on the project. ${CLEAR}`),
        status: z.enum(PROJECT_STATUSES).optional().describe("Project status."),
        website_url: text(`Live link, full https:// URL. ${CLEAR}`),
        cover_image_alt: text(`Cover image description. ${CLEAR}`),
        overview: text(`Case study: overview. ${CLEAR}`),
        problem: text(`Case study: the problem. ${CLEAR}`),
        solution: text(`Case study: the solution. ${CLEAR}`),
        dev_role: text(`Case study: development role. ${CLEAR}`),
        monetization: text(`Case study: monetization. ${CLEAR}`),
        tech_intro: text(`Intro paragraph for the tech stack section. ${CLEAR}`),
        project_summary: text(`Closing summary. ${CLEAR}`),
        is_published: flag("Visible on the public site."),
        is_featured: flag("Featured on the home page."),
        technology_names: strings("Tech stack by technology name (must exist in the technologies list). Replaces the whole stack."),
        features: z.array(z.object({ title: z.string().describe("Feature title."), description: z.string().optional().describe("Feature description.") })).optional().describe("Key features. Replaces the whole list; existing feature images are kept by title."),
        tech_breakdown: z.array(z.object({ label: z.string().describe("Label, e.g. Frontend."), description: z.string().describe("What was used and why.") })).optional().describe("Tech breakdown rows. Replaces the whole list."),
    }),
    async prepare (supabase, changes, base) {
        const { technology_names: names, features, ...rest } = changes as Row & { technology_names?: string[], features?: { title: string, description?: string }[] }
        const next: Row = { ...rest }

        if (names) {
            const technologies = await listTechnologiesForAdmin(supabase)
            const byKey = new Map(technologies.flatMap(tech => [[tech.name.toLowerCase(), tech.id], [tech.slug, tech.id]]))
            const unknown = names.filter(name => !byKey.has(name.trim().toLowerCase()))
            if (unknown.length) {
                return { ok: false, message: `Unknown technologies: ${unknown.join(", ")}. Available: ${technologies.map(tech => tech.name).join(", ")}. Propose creating the missing technology first if the owner wants it.` }
            }
            next.technology_ids = [...new Set(names.map(name => byKey.get(name.trim().toLowerCase()) as string))]
        }

        if (features) {
            const current = (base.features as { title: string, image_path: string | null, image_alt: string | null }[] | undefined) ?? []
            next.features = features.map(feature => {
                const match = current.find(item => item.title.trim().toLowerCase() === feature.title.trim().toLowerCase())
                return { title: feature.title, description: feature.description ?? null, image_path: match?.image_path ?? null, image_alt: match?.image_alt ?? null }
            })
        }
        return { ok: true, changes: next }
    },
    async display (supabase, input) {
        const technologies = await listTechnologiesForAdmin(supabase)
        const names = new Map(technologies.map(tech => [tech.id, tech.name]))
        return {
            ...input,
            technology_ids: undefined,
            stack: ((input.technology_ids as string[] | undefined) ?? []).map(id => names.get(id) ?? id),
            features: ((input.features as { title: string }[] | undefined) ?? []).map(feature => feature.title),
            tech_breakdown: ((input.tech_breakdown as { label: string }[] | undefined) ?? []).map(row => row.label),
            gallery: `${((input.gallery as unknown[] | undefined) ?? []).length} images`,
        }
    },
    list: async supabase => (await listProjectsForAdmin(supabase)).map(row => ({
        id: row.id, name: row.name, slug: row.slug, year: row.year, project_type: row.project_type, status: row.status, is_published: row.is_published, is_featured: row.is_featured,
    })),
    async view (supabase, id) {
        if (!id) return null
        const row = await getProjectForAdmin(supabase, id)
        if (!row) return null
        const technologies = await listTechnologiesForAdmin(supabase)
        const names = new Map(technologies.map(tech => [tech.id, tech.name]))
        const { technology_ids: ids, gallery, ...rest } = row
        return { ...rest, technology_names: ids.map(techId => names.get(techId) ?? techId), gallery_images: gallery.length }
    },
    base: async (supabase, id) => (id ? pick(await getProjectForAdmin(supabase, id), PROJECT_KEYS) : null),
    name: row => String(row.name ?? "Project"),
    save: (supabase, id, input) => saveProject(supabase, id, input as ProjectInput),
    toggle: (supabase, id, field, value) => toggleProject(supabase, id, field as "is_published" | "is_featured", value),
    remove: deleteProject,
}

const technology: Adapter = {
    label: "Technology",
    about: "Technologies that can be attached to projects (the tech stack list).",
    canCreate: true,
    inputSchema: technologyInputSchema,
    defaults: { name: "", slug: "", icon_path: null },
    fields: z.object({
        name: text('Display name, e.g. "Next.js".'),
        slug: text("Lowercase-kebab-case slug, unique, e.g. nextjs."),
    }),
    list: async supabase => (await listTechnologiesForAdmin(supabase)).map(tech => ({ id: tech.id, name: tech.name, slug: tech.slug, used_by_projects: tech.usageCount })),
    async view (supabase, id) {
        if (!id) return null
        const { data } = await supabase.from("technologies").select("id, name, slug, icon_path").eq("id", id).maybeSingle()
        return data
    },
    async base (supabase, id) {
        if (!id) return null
        const { data } = await supabase.from("technologies").select("name, slug, icon_path").eq("id", id).maybeSingle()
        return data
    },
    name: row => String(row.name ?? "Technology"),
    save: (supabase, id, input) => (id ? updateTechnology(supabase, id, input as TechnologyInput) : createTechnology(supabase, input as TechnologyInput)),
    remove: deleteTechnology,
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

const POST_KEYS = ["title", "slug", "excerpt", "content", "cover_path", "seo_description", "canonical_url", "status", "published_at"]

const blogPost: Adapter = {
    label: "Blog post",
    about: "Blog posts. Bodies are written in simple Markdown.",
    canCreate: true,
    inputSchema: blogPostInputSchema as unknown as z.ZodType<Row>,
    defaults: { title: "", slug: "", excerpt: null, content: { type: "doc", content: [{ type: "paragraph" }] }, cover_path: null, seo_description: null, canonical_url: null, status: "draft", published_at: undefined },
    fields: z.object({
        title: text("Post title (max 160 chars)."),
        slug: text("URL slug, lowercase-kebab-case, unique."),
        excerpt: text(`Short excerpt (max 300 chars). ${CLEAR}`),
        body_markdown: text("Full post body in Markdown (## and ### headings, paragraphs, - or 1. lists, > quotes, **bold**, *italic*, `code`, [links](https://…), ``` code blocks). Replaces the whole body."),
        seo_description: text(`Meta description (max 200 chars). ${CLEAR}`),
        canonical_url: text(`Canonical URL if first published elsewhere, https://. ${CLEAR}`),
        status: z.enum(POST_STATUSES).optional().describe("draft or published."),
        published_at: text("Publish date-time, ISO 8601 with offset, e.g. 2026-11-23T09:00:00Z."),
    }),
    async prepare (_supabase, changes, base) {
        const { body_markdown: body, ...rest } = changes as Row & { body_markdown?: string }
        // New posts default to "now" as the publish date.
        if (!base.published_at && !rest.published_at) rest.published_at = new Date().toISOString()
        if (body === undefined) return { ok: true, changes: rest }
        if (body.length > 200_000) return { ok: false, message: "The post body is too long." }
        return { ok: true, changes: { ...rest, content: markdownToDoc(body) } }
    },
    display: async (_supabase, input) => ({ ...input, content: truncate(toPlainText(input.content as BlogDoc), 300) }),
    list: async supabase => (await listPostsForAdmin(supabase)).map(post => ({ id: post.id, title: post.title, slug: post.slug, status: post.status, published_at: post.published_at })),
    async view (supabase, id) {
        if (!id) return null
        const post = await getPostForAdmin(supabase, id)
        if (!post) return null
        const { content, ...rest } = post
        return { ...rest, coverUrl: undefined, body_markdown: truncate(docToMarkdown(content), 30_000) }
    },
    base: async (supabase, id) => (id ? pick(await getPostForAdmin(supabase, id), POST_KEYS) : null),
    name: row => String(row.title ?? "Post"),
    save: (supabase, id, input) => (id ? updatePost(supabase, id, input as BlogPostInput) : createPost(supabase, input as BlogPostInput)),
    remove: deletePost,
}

// ---------------------------------------------------------------------------
// Job tracker
// ---------------------------------------------------------------------------

const JOB_KEYS = ["company", "role", "job_url", "location", "salary", "source", "status", "applied_on", "follow_up_on", "resume_id", "cover_letter_id", "priority", "notes", "is_archived"]

const job: Adapter = {
    label: "Job application",
    about: "Job tracker entries (applications Rogers is tracking).",
    canCreate: true,
    inputSchema: jobInputSchema as unknown as z.ZodType<Row>,
    defaults: { company: "", role: "", job_url: null, location: null, salary: null, source: null, status: "saved", applied_on: null, follow_up_on: null, resume_id: null, cover_letter_id: null, priority: 0, notes: null, is_archived: false },
    fields: z.object({
        company: text("Company."),
        role: text("Role / job title."),
        job_url: text(`Link to the job post, http(s)://. ${CLEAR}`),
        location: text(`Location. ${CLEAR}`),
        salary: text(`Salary range. ${CLEAR}`),
        source: text(`Where the job was found, e.g. LinkedIn. ${CLEAR}`),
        status: z.enum(JOB_STATUSES).optional().describe("Board column."),
        applied_on: text(`Date applied, YYYY-MM-DD. ${CLEAR}`),
        follow_up_on: text(`Follow-up date, YYYY-MM-DD. ${CLEAR}`),
        priority: int("Priority 0-3."),
        notes: text(`Private notes (max 5000 chars). ${CLEAR}`),
        is_archived: flag("Archived (hidden from the board)."),
    }),
    async list (supabase) {
        const [active, archived] = await Promise.all([listJobs(supabase, false), listJobs(supabase, true)])
        return [...active, ...archived].map(item => ({ id: item.id, company: item.company, role: item.role, status: item.status, applied_on: item.applied_on, follow_up_on: item.follow_up_on, is_archived: item.is_archived }))
    },
    view: async (supabase, id) => (id ? pick(await getJob(supabase, id) as Row | null, ["id", ...JOB_KEYS, "status_changed_at"]) : null),
    base: async (supabase, id) => (id ? pick(await getJob(supabase, id) as Row | null, JOB_KEYS) : null),
    name: row => `${row.role ?? "Role"} at ${row.company ?? "company"}`,
    save: (supabase, id, input) => (id ? updateJob(supabase, id, input as JobInput) : createJob(supabase, input as JobInput)),
    remove: deleteJob,
}

// ---------------------------------------------------------------------------
// Inquiries: never expose contact details or the visitor's message to the model.
// ---------------------------------------------------------------------------

const INQUIRY_COLUMNS = "id, name, project_type, budget, status, notes, created_at"

const inquiry: Adapter = {
    label: "Inquiry",
    about: "Start-a-project inquiries from visitors. Only status and private notes can change. Contact details and messages are not available to the assistant.",
    inputSchema: projectRequestUpdateSchema as unknown as z.ZodType<Row>,
    fields: z.object({
        status: z.enum(REQUEST_STATUSES).optional().describe("Inquiry status."),
        notes: text(`Private notes (max 4000 chars). ${CLEAR}`),
    }),
    async list (supabase) {
        const { data, error } = await supabase.from("project_requests").select(INQUIRY_COLUMNS).order("created_at", { ascending: false }).limit(200)
        if (error) throw new Error(`Failed to load inquiries: ${error.message}`)
        return data ?? []
    },
    async view (supabase, id) {
        if (!id) return null
        const { data } = await supabase.from("project_requests").select(INQUIRY_COLUMNS).eq("id", id).maybeSingle()
        return data
    },
    async base (supabase, id) {
        if (!id) return null
        const { data } = await supabase.from("project_requests").select("name, status, notes").eq("id", id).maybeSingle()
        return data
    },
    name: row => `Inquiry from ${row.name ?? "visitor"}`,
    save: (supabase, id, input) => (id ? updateInquiry(supabase, id, input as InquiryUpdate) : Promise.resolve(failure(400, "invalid_input", "Inquiries can't be created."))),
    remove: deleteInquiry,
}

// ---------------------------------------------------------------------------
// Singleton pages
// ---------------------------------------------------------------------------

function singletonAdapter (config: SingletonConfig, label: string, about: string, fields: z.ZodObject<z.ZodRawShape>, keys: string[]): Adapter {
    return {
        label,
        about,
        singleton: true,
        inputSchema: config.inputSchema,
        fields,
        list: async supabase => [pick(await config.get(supabase), keys) ?? {}],
        view: async supabase => pick(await config.get(supabase), keys),
        base: async supabase => config.get(supabase),
        name: () => label,
        save: (supabase, _id, input) => updateSingleton(supabase, config, input),
    }
}

const ABOUT_TEXT_KEYS = ["badge", "title", "highlight", "intro", "photo_alt", "early_eyebrow", "early_title", "early_body", "journey_eyebrow", "journey_title", "journey_body", "journey_image_alt", "cta_title", "cta_label"]
const aboutPage = singletonAdapter(aboutPageConfig, "About page", "Text of the About page (hero, early life, journey, call to action).", z.object({
    badge: text("Small badge above the title (max 40)."),
    title: text("Hero title (max 80)."),
    highlight: text("Highlighted part of the title (max 80)."),
    intro: text("Intro paragraph (max 4000)."),
    photo_alt: text("Hero photo description (max 200)."),
    early_eyebrow: text("Early-life section eyebrow (max 60)."),
    early_title: text("Early-life section title (max 60)."),
    early_body: text("Early-life section text (max 6000)."),
    journey_eyebrow: text("Journey section eyebrow (max 60)."),
    journey_title: text("Journey section title (max 60)."),
    journey_body: text("Journey section text (max 6000)."),
    journey_image_alt: text("Journey image description (max 200)."),
    cta_title: text("Call-to-action title (max 80)."),
    cta_label: text("Call-to-action button label (max 40)."),
}), ABOUT_TEXT_KEYS)

const GALLERY_TEXT_KEYS = ["badge", "title", "highlight", "quote", "signature", "hero_alt", "cta_title", "cta_label"]
const galleryPage = singletonAdapter(galleryPageConfig, "Gallery page", "Text of the Gallery page.", z.object({
    badge: text("Small badge above the title (max 40)."),
    title: text("Title (max 80)."),
    highlight: text("Highlighted part of the title (max 80)."),
    quote: text("Quote (max 2000)."),
    signature: text(`Quote signature (max 60). ${CLEAR}`),
    hero_alt: text("Hero image description (max 200)."),
    cta_title: text("Call-to-action title (max 80)."),
    cta_label: text("Call-to-action button label (max 40)."),
}), GALLERY_TEXT_KEYS)

const BLOG_PAGE_KEYS = ["badge", "title", "highlight", "intro", "substack_url", "cta_title", "cta_label"]
const blogPage = singletonAdapter(blogPageConfig, "Blog page", "Text of the Blog index page.", z.object({
    badge: text("Small badge above the title (max 40)."),
    title: text("Title (max 80)."),
    highlight: text("Highlighted part of the title (max 80)."),
    intro: text("Intro (max 600)."),
    substack_url: text(`Substack link, https://. ${CLEAR}`),
    cta_title: text("Call-to-action title (max 80)."),
    cta_label: text("Call-to-action button label (max 40)."),
}), BLOG_PAGE_KEYS)

const PROJECT_FORM_KEYS = ["whatsapp_number", "contact_email", "contact_phone", "countries", "project_types", "budgets"]
const projectForm = singletonAdapter(projectFormConfig, "Project form settings", "Settings of the public Start-a-project form (contact details and answer options). Step wording is edited in the admin.", z.object({
    whatsapp_number: text(`WhatsApp number with country code, digits only. ${CLEAR}`),
    contact_email: text(`Contact email. ${CLEAR}`),
    contact_phone: text(`Contact phone. ${CLEAR}`),
    countries: strings("Country options (max 4). Replaces the list."),
    project_types: strings("Project type options (1-12). Replaces the list."),
    budgets: strings("Budget options (1-12). Replaces the list."),
}), PROJECT_FORM_KEYS)

// ---------------------------------------------------------------------------

export const ADAPTERS = {
    project,
    technology,
    experience,
    testimonial,
    about_fact: aboutFact,
    gallery_photo: galleryPhoto,
    blog_post: blogPost,
    job,
    inquiry,
    about_page: aboutPage,
    gallery_page: galleryPage,
    blog_page: blogPage,
    project_form: projectForm,
} satisfies Record<ContentType, Adapter>

export const CONTENT_TYPES: readonly ContentType[] = AGENT_TYPES

export function adapterFor (type: ContentType): Adapter {
    return ADAPTERS[type]
}
