import type { IconType } from "react-icons"
import { LuBookOpen, LuBriefcase, LuCalendar, LuCamera, LuCode, LuGraduationCap, LuHeart, LuHouse, LuMapPin, LuStar, LuTrophy, LuUsers } from "react-icons/lu"
import type { FactIcon } from "@/lib/pages/schema"

// Fixed allowlist: the database stores a key, never a component name.
export const FACT_ICON_COMPONENTS: Record<FactIcon, IconType> = {
    calendar: LuCalendar,
    graduation: LuGraduationCap,
    briefcase: LuBriefcase,
    users: LuUsers,
    heart: LuHeart,
    "map-pin": LuMapPin,
    star: LuStar,
    book: LuBookOpen,
    code: LuCode,
    camera: LuCamera,
    trophy: LuTrophy,
    home: LuHouse,
}

export const FACT_ICON_LABELS: Record<FactIcon, string> = {
    calendar: "Calendar",
    graduation: "Graduation cap",
    briefcase: "Briefcase",
    users: "People",
    heart: "Heart",
    "map-pin": "Map pin",
    star: "Star",
    book: "Book",
    code: "Code",
    camera: "Camera",
    trophy: "Trophy",
    home: "Home",
}
