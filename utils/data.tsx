import { NavbarMenuItems, Project, Testimonial, ExperienceItem } from "@/types/type";
import Figma  from '@/assets/images/figma.svg'
import HTML5  from '@/assets/images/html5.svg'
import CSS3  from '@/assets/images/css3.svg'
import Javascript  from '@/assets/images/javascript.svg'
import Typescript  from '@/assets/images/typescript.svg'
import Firebase  from '@/assets/images/firebase.svg'
import Supabase  from '@/assets/images/supabase.svg'
import WordPress  from '@/assets/images/wordpress.svg'

export const logos = [
    { name: 'Figma', image: Figma },
    { name: 'HTML5', image: HTML5 },
    { name: 'CSS3', image: CSS3 },
    { name: 'Javascript', image: Javascript },
    { name: 'Typescript', image: Typescript },
    { name: 'Firebase', image: Firebase },
    { name: 'Supabase', image: Supabase },
    { name: 'WordPress', image: WordPress }
]

export const NavbarMenu: NavbarMenuItems[] = [
    { menu: "Home", href: "/", hasDropdown: false },
    { menu: "Projects", href: "/", hasDropdown: false },
    { menu: "Blog", href: "/blog", hasDropdown: false,},
    { menu: "About", href: "/support", hasDropdown: true, 
        submenu: [
            { menu: "Work Experience", href: '/support'},
            { menu: "Work ", href: '/support'},
            { menu: "Experience", href: '/support'},
        ]
    },
    {menu: "Learn From Me", href: "/learn", hasDropdown: true,
        submenu: [
            { menu: "Javascript", href: '/support'},
            { menu: "HTML", href: '/support'},
            { menu: "CSS", href: '/support'},
        ]
    }
]

export const projects: Project[] = [
    {
        title: "Lendify — Lending Platform",
        description: "Full-stack lending dashboard for a financial institution, delivering instant credit decisions and a design system that scales across web and mobile.",
        tags: ["Fintech", "Dashboard", "Design System"],
        stack: ["Next.js", "TypeScript", "Supabase", "Figma"],
        year: "2025",
        href: "/",
        accent: ["#DE0EFF", "#751CFF"],
    },
    {
        title: "Restack — SaaS Web App",
        description: "Multi-tenant SaaS workspace with realtime collaboration, billing flows, and AI-assisted onboarding for a fast-growing startup.",
        tags: ["SaaS", "Web App", "Realtime"],
        stack: ["React", "Firebase", "Tailwind", "Figma"],
        year: "2025",
        href: "/",
        accent: ["#00C2FF", "#751CFF"],
    },
    {
        title: "Vault — Fintech Mobile",
        description: "Pocket-to-investment mobile experience connecting savings, budgeting, and trading for a startup's core consumer product.",
        tags: ["Fintech", "Mobile", "UI Kit"],
        stack: ["Next.js", "TypeScript", "Firebase", "Figma"],
        year: "2024",
        href: "/",
        accent: ["#F505FF", "#FF7A00"],
    },
    {
        title: "Scale — WordPress Revamp",
        description: "High-performance WordPress rebuild with a modern design system, headless CMS integrations, and sub-second page loads.",
        tags: ["WordPress", "CMS", "Marketing"],
        stack: ["WordPress", "CSS3", "Javascript", "Figma"],
        year: "2024",
        href: "/",
        accent: ["#FF7A00", "#DE0EFF"],
    },
]

export const testimonials: Testimonial[] = [
    {
        quote: "Rogers took our vague idea and shipped a product that felt designed, engineered, and polished from day one. Our investors were blown away by the demo.",
        name: "Ada Onyeka",
        role: "CEO, Lendify",
        initials: "AO",
        rating: 5,
    },
    {
        quote: "One of the rare people who can bridge design and code. He rebuilt our platform, cut page loads by 60%, and made the team fall in love with the interface.",
        name: "Marcus Bell",
        role: "CTO, Restack",
        initials: "MB",
        rating: 5,
    },
    {
        quote: "Fast, communicative, and obsessed with detail. Our mobile app finally feels like a product our users want to open every day.",
        name: "Sara Adeyemi",
        role: "Product Lead, Vault",
        initials: "SA",
        rating: 5,
    },
]

export const experience: ExperienceItem[] = [
    {
        role: "Senior Full-Stack Designer",
        company: "Lendify",
        period: "2024 — Present",
        description: "Leading design and frontend architecture for a lending platform, building a scalable design system and shipping fintech products to thousands of users.",
        stack: ["Next.js", "TypeScript", "Figma", "Supabase"],
    },
    {
        role: "Product Designer & Frontend Developer",
        company: "Restack",
        period: "2023 — 2024",
        description: "Designed and built a realtime SaaS workspace, owning the product from research through polished, accessible UI to production.",
        stack: ["React", "Firebase", "Tailwind", "Figma"],
    },
    {
        role: "Freelance Web Developer",
        company: "Self Employed",
        period: "2021 — 2023",
        description: "Delivered websites and web apps for startups and financial institutions, pairing rapid prototyping with clean, maintainable code.",
        stack: ["Javascript", "HTML5", "CSS3", "WordPress"],
    },
]