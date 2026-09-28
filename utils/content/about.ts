// About Me page content. Edit the text here; the page layout lives in app/(site)/about/page.tsx.
// Everything below is drawn from what's already on the site (hero tagline, experience mockup,
// footer) — review the wording and make it yours.

export const aboutIntro = {
    badge: "About Me 👋🏽",
    title: "Hi, I'm Rogers.",
    highlight: "Designer. Developer. Builder.",
    paragraphs: [
        "I'm a full-stack designer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions.",
        "I own products end to end — from the first sketch and design system to the database, APIs and the polished interface people actually use.",
        "Designed & built with passion in Nigeria, shipped for clients around the world.",
    ],
}

export const aboutChips = ["11+ yrs experience", "📍 Nigeria"]

export const aboutHighlights = [
    { value: "11+", label: "Years of experience" },
    { value: "Design + Code", label: "End-to-end ownership" },
    { value: "AI-first", label: "Modern product builds" },
    { value: "Global", label: "Startups & financial institutions" },
]

export const aboutServices = [
    {
        title: "Product Design",
        description: "UI/UX, design systems and prototypes that make complex products feel simple.",
    },
    {
        title: "Full-Stack Development",
        description: "Fast, scalable web apps with Next.js, Supabase and clean, typed APIs.",
    },
    {
        title: "AI-powered Products",
        description: "Assistants, RAG chatbots and automation that save teams real hours.",
    },
] as const
