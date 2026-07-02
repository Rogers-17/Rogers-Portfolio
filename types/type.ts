export interface NavbarMenuItems{
    menu: string;
    href: string;
    hasDropdown: boolean;
    submenu?: {
        menu: string;
        href: string;
    }[]
}