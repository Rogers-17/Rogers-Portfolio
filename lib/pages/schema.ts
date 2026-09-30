import { z } from "zod"
import { publicImageUrl } from "@/lib/storage"

// Client-safe read schemas, defaults and display helpers for the About, Gallery and
// Start-a-project pages. Defaults match supabase/seed_about_gallery_project_form.sql and
// are used when a row is missing (e.g. before the migration/seed has been run).

export const FACT_ICONS = ["calendar", "graduation", "briefcase", "users", "heart", "map-pin", "star", "book", "code", "camera", "trophy", "home"] as const
export type FactIcon = (typeof FACT_ICONS)[number]

export const STEP_KEYS = ["name", "location", "type", "business", "deadline", "budget", "details", "send"] as const
export type StepKey = (typeof STEP_KEYS)[number]

export const STEP_LABELS: Record<StepKey, string> = {
    name: "1. Name",
    location: "2. Location",
    type: "3. Project type",
    business: "4. Business / product",
    deadline: "5. Completion date",
    budget: "6. Budget",
    details: "7. Project details",
    send: "Send screen",
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

// A blank line starts a new paragraph.
export function splitParagraphs (text: string): string[] {
    return text.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean)
}

// "**bold**" -> segments rendered as <strong>; everything stays React text (no HTML).
export function emphasisSegments (text: string): { text: string, bold: boolean }[] {
    return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4
            ? { text: part.slice(2, -2), bold: true }
            : { text: part, bold: false })
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export const ABOUT_COLUMNS =
    "badge, title, highlight, intro, photo_primary_path, photo_secondary_path, photo_alt, background_path, early_eyebrow, early_title, early_body, journey_eyebrow, journey_title, journey_body, journey_image_path, journey_image_alt, cta_title, cta_label"

export const aboutRowSchema = z.object({
    badge: z.string(),
    title: z.string(),
    highlight: z.string(),
    intro: z.string(),
    photo_primary_path: z.string().nullable(),
    photo_secondary_path: z.string().nullable(),
    photo_alt: z.string(),
    background_path: z.string().nullable(),
    early_eyebrow: z.string(),
    early_title: z.string(),
    early_body: z.string(),
    journey_eyebrow: z.string(),
    journey_title: z.string(),
    journey_body: z.string(),
    journey_image_path: z.string().nullable(),
    journey_image_alt: z.string(),
    cta_title: z.string(),
    cta_label: z.string(),
})

export type AboutRow = z.infer<typeof aboutRowSchema>

export const DEFAULT_ABOUT: AboutRow = {
    badge: "About Me 😍",
    title: "My name is Rogers.",
    highlight: "Full-stack Designer.",
    intro: [
        "I'm Mohammed N. Rogers, a full-stack designer harnessing AI, design and code to rapidly deliver intuitive solutions for startups and financial institutions.",
        "Depending on who's asking, I'm a product designer, a frontend and backend developer, a brand thinker, or the person who turns a rough idea into a working product.",
        "I own products end to end: from the first sketch and design system to the database, the APIs and the polished interface people actually use.",
        "Designed & built with passion in Nigeria, shipped for clients around the world.",
    ].join("\n\n"),
    photo_primary_path: null,
    photo_secondary_path: null,
    photo_alt: "Portrait of Rogers",
    background_path: null,
    early_eyebrow: "Let's get closer …",
    early_title: "My Early Life",
    early_body: [
        "Every builder has an origin story, and mine starts with curiosity: taking things apart, asking how they worked and wanting to make my own.",
        "That curiosity found a home on the computer. What began as exploring and experimenting slowly turned into design, then code, and eventually into a career.",
    ].join("\n\n"),
    journey_eyebrow: "The Journey",
    journey_title: "Work Life",
    journey_body: [
        "Over the years I've worked across design and engineering, helping startups and financial institutions go from idea to launch.",
        "Today I pair product thinking with modern tools like Next.js, Supabase and AI to ship fast, reliable products that people enjoy using.",
    ].join("\n\n"),
    journey_image_path: null,
    journey_image_alt: "Illustration of Rogers",
    cta_title: "Ready to create something huge?",
    cta_label: "Let's Work",
}

export const ABOUT_FACT_COLUMNS = "id, icon, title, body"

export const aboutFactSchema = z.object({
    id: z.string(),
    icon: z.enum(FACT_ICONS),
    title: z.string(),
    body: z.string(),
})

export type AboutFact = z.infer<typeof aboutFactSchema>

export const DEFAULT_ABOUT_FACTS: AboutFact[] = [
    { id: "born", icon: "calendar", title: "Born", body: "The start of the story. Add where and when you were born." },
    { id: "education", icon: "graduation", title: "Education", body: "Schools, courses and the lessons that stuck. Add your education here." },
    { id: "career", icon: "briefcase", title: "Career", body: "From the first client to today. Add your career milestones here." },
    { id: "family", icon: "users", title: "Family", body: "The people behind the work. Add a note about your family here." },
]

export type AboutContent = AboutRow & {
    photoPrimaryUrl: string | null
    photoSecondaryUrl: string | null
    backgroundUrl: string | null
    journeyImageUrl: string | null
}

export const withAboutUrls = (row: AboutRow): AboutContent => ({
    ...row,
    photoPrimaryUrl: publicImageUrl("site-images", row.photo_primary_path),
    photoSecondaryUrl: publicImageUrl("site-images", row.photo_secondary_path),
    backgroundUrl: publicImageUrl("site-images", row.background_path),
    journeyImageUrl: publicImageUrl("site-images", row.journey_image_path),
})

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export const GALLERY_COLUMNS = "badge, title, highlight, quote, signature, hero_path, hero_alt, cta_title, cta_label"

export const galleryRowSchema = z.object({
    badge: z.string(),
    title: z.string(),
    highlight: z.string(),
    quote: z.string(),
    signature: z.string().nullable(),
    hero_path: z.string().nullable(),
    hero_alt: z.string(),
    cta_title: z.string(),
    cta_label: z.string(),
})

export type GalleryRow = z.infer<typeof galleryRowSchema>

export const DEFAULT_GALLERY: GalleryRow = {
    badge: "Gallery 🖼️",
    title: "Welcome to",
    highlight: "My Gallery.",
    quote: [
        "Behind every project there's a life being lived. These are the moments between the builds: the places, the people and the days worth remembering.",
        "Every photo here is a small reminder of where I've been and who I'm becoming.",
    ].join("\n\n"),
    signature: "Rogers",
    hero_path: null,
    hero_alt: "Rogers",
    cta_title: "Ready to create something huge?",
    cta_label: "Let's Work",
}

export type GalleryContent = GalleryRow & { heroUrl: string | null }

export const withGalleryUrls = (row: GalleryRow): GalleryContent => ({
    ...row,
    heroUrl: publicImageUrl("site-images", row.hero_path),
})

export const GALLERY_PHOTO_COLUMNS = "id, image_path, width, height, alt, caption"

export const galleryPhotoSchema = z
    .object({
        id: z.string(),
        image_path: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        alt: z.string(),
        caption: z.string().nullable(),
    })
    .transform(row => ({
        id: row.id,
        src: publicImageUrl("site-images", row.image_path) ?? "",
        width: row.width,
        height: row.height,
        alt: row.alt,
        caption: row.caption,
    }))

export type GalleryPhoto = z.infer<typeof galleryPhotoSchema>

// ---------------------------------------------------------------------------
// Start-a-project form settings
// ---------------------------------------------------------------------------

export const stepCopySchema = z.object({
    eyebrow: z.string().trim().max(60, "Max 60 characters"),
    title: z.string().trim().min(1, "Required").max(100, "Max 100 characters"),
    subtitle: z.string().trim().max(200, "Max 200 characters"),
})

export type StepCopy = z.infer<typeof stepCopySchema>

export const DEFAULT_STEPS: Record<StepKey, StepCopy> = {
    name: { eyebrow: "Hey there 👋", title: "What's your name?", subtitle: "Your first name would do just fine." },
    location: { eyebrow: "Nice to meet you, {name} 🤝", title: "Where are you based?", subtitle: "Pick your country, or choose Other." },
    type: { eyebrow: "Let's talk shop 🛠️", title: "What type of project is it?", subtitle: "Pick the one that fits best." },
    business: { eyebrow: "Tell me more 🏢", title: "What's the name of your business or product?", subtitle: "A working name is fine too." },
    deadline: { eyebrow: "Timeline ⏳", title: "When do you need it done?", subtitle: "Pick a target date, or let me know you're flexible." },
    budget: { eyebrow: "Almost there 💰", title: "What's your budget?", subtitle: "A rough range helps me plan the right approach." },
    details: { eyebrow: "Last step ✍️", title: "Tell me about the project", subtitle: "Goals, features, links: anything that helps me understand what you need." },
    send: { eyebrow: "All done! 🎉", title: "How would you like to send this?", subtitle: "Choose your preferred method and your project details will be formatted and ready to send." },
}

// Tolerant read: missing or invalid step entries fall back to the defaults.
const stepsReadSchema = z.unknown().transform(value => {
    const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
    return Object.fromEntries(STEP_KEYS.map(key => {
        const parsed = stepCopySchema.safeParse(source[key])
        return [key, parsed.success ? parsed.data : DEFAULT_STEPS[key]]
    })) as Record<StepKey, StepCopy>
})

export const PROJECT_FORM_COLUMNS = "whatsapp_number, contact_email, contact_phone, countries, project_types, budgets, steps"

export const projectFormRowSchema = z.object({
    whatsapp_number: z.string().nullable(),
    contact_email: z.string().nullable(),
    contact_phone: z.string().nullable(),
    countries: z.array(z.string()),
    project_types: z.array(z.string()),
    budgets: z.array(z.string()),
    steps: stepsReadSchema,
})

export type ProjectFormSettings = z.infer<typeof projectFormRowSchema>

export const DEFAULT_PROJECT_FORM: ProjectFormSettings = {
    whatsapp_number: null,
    contact_email: null,
    contact_phone: null,
    countries: ["Nigeria", "United Kingdom", "United States", "Canada"],
    project_types: ["Website", "Web App", "Mobile App", "UI/UX Design", "Branding", "Other"],
    budgets: ["< $1,000", "$1,000 – $3,000", "$3,000 – $7,000", "$7,000 – $15,000", "$15,000+"],
    steps: DEFAULT_STEPS,
}
