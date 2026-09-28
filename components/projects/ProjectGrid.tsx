"use client"

import { motion } from "framer-motion"
import type { ProjectCard as ProjectCardData } from "@/lib/projects/schema"
import ProjectCard from "@/components/projects/ProjectCard"

const container = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.12 },
    },
}

const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

export default function ProjectGrid ({ projects }: { projects: ProjectCardData[] }) {
    if (projects.length === 0) {
        return <p className="mt-10 text-muted md:mt-14">Projects coming soon.</p>
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-10 grid grid-cols-1 gap-x-5 gap-y-10 md:mt-14 md:grid-cols-2 lg:grid-cols-3"
        >
            {projects.map(project => (
                <motion.article key={project.slug} variants={item}>
                    <ProjectCard project={project} />
                </motion.article>
            ))}
        </motion.div>
    )
}
