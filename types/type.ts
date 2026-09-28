export interface NavbarMenuItems{
    menu: string;
    href: string;
    hasDropdown: boolean;
    submenu?: {
        menu: string;
        href: string;
    }[]
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