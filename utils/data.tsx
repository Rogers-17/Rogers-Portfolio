import { NavbarMenuItems } from "@/types/type";
import Figma  from '@/assets/images/figma.svg'
import HTML5  from '@/assets/images/html5.svg'
import CSS3  from '@/assets/images/css3.svg'
import Javascript  from '@/assets/images/javascript.svg'
import Typescript  from '@/assets/images/typescript.svg'
import Firebase  from '@/assets/images/firebase.svg'
import Supabase  from '@/assets/images/supabase.svg'
import WordPress  from '@/assets/images/wordpress.svg'
import Image from 'next/image'

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