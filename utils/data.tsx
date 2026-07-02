import { NavbarMenuItems } from "@/types/type";

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