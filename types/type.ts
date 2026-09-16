export interface NavbarMenuItems{
    menu: string;
    href: string;
    hasDropdown: boolean;
    submenu?: {
        menu: string;
        href: string;
    }[]
}

export interface Project {
    title: string;
    description: string;
    tags: string[];
    stack: string[];
    year: string;
    href: string;
    accent: [string, string];
}

export interface Testimonial {
    quote: string;
    name: string;
    role: string;
    initials: string;
    rating: number;
}

export interface ExperienceItem {
    role: string;
    company: string;
    period: string;
    description: string;
    stack: string[];
}