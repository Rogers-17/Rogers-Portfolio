import { LuBookOpen, LuGraduationCap, LuHouse, LuLayoutGrid, LuRocket, LuUser } from "react-icons/lu"
import type { NavItem } from "@/types/type";
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

export const navItems: NavItem[] = [
    { kind: "link", label: "Home", href: "/", icon: LuHouse },
    { kind: "link", label: "Projects", href: "/projects", icon: LuLayoutGrid },
    { kind: "link", label: "Blog", href: "/blog", icon: LuBookOpen },
    {
        kind: "menu",
        id: "about",
        label: "About",
        icon: LuUser,
        children: [
            { label: "About Me", href: "/about" },
            { label: "Gallery", href: "/gallery" },
        ],
    },
    {
        kind: "menu",
        id: "learn",
        label: "Learn From Me",
        icon: LuGraduationCap,
        children: [
            { label: "Coding Courses", href: "/learn/coding-courses" },
        ],
    },
]

export const startProjectLink = { label: "Start A Project", href: "/start-a-project", icon: LuRocket }
