import Image from "next/image"
import type { ProjectTechnology } from "@/lib/projects/schema"

export default function TechGrid ({ technologies }: { technologies: ProjectTechnology[] }) {
    return (
        <ul className="mt-8 grid grid-cols-3 gap-3">
            {technologies.map(tech => (
                <li key={tech.id} className="flex flex-col items-center gap-3 rounded-xl border border-white/6 bg-[#0e0b16] px-2 py-5 text-center">
                    {tech.iconUrl ? (
                        <Image src={tech.iconUrl} alt="" width={40} height={40} className="size-10 object-contain" />
                    ) : (
                        <span className="flex size-10 items-center justify-center rounded-full bg-white/8 text-sm font-bold" aria-hidden="true">
                            {tech.name.slice(0, 2).toUpperCase()}
                        </span>
                    )}
                    <span className="text-xs font-semibold">{tech.name}</span>
                </li>
            ))}
        </ul>
    )
}
