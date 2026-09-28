import "server-only"
import { cache } from "react"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase/server"
import { EXPERIENCES_CACHE_TAG, TESTIMONIALS_CACHE_TAG } from "@/lib/content/cache"
import {
    EXPERIENCE_COLUMNS,
    TESTIMONIAL_COLUMNS,
    experiencePublicSchema,
    testimonialPublicSchema,
    type ExperiencePublic,
    type TestimonialPublic,
} from "@/lib/content/schema"

export const getPublishedTestimonials = cache(async (): Promise<TestimonialPublic[]> => {
    const { data, error } = await createServerSupabase(TESTIMONIALS_CACHE_TAG)
        .from("testimonials")
        .select(TESTIMONIAL_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

    if (error) throw new Error(`Failed to load testimonials: ${error.message}`)
    return z.array(testimonialPublicSchema).parse(data)
})

export const getPublishedExperiences = cache(async (): Promise<ExperiencePublic[]> => {
    const { data, error } = await createServerSupabase(EXPERIENCES_CACHE_TAG)
        .from("experiences")
        .select(EXPERIENCE_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("start_year", { ascending: false })

    if (error) throw new Error(`Failed to load experience: ${error.message}`)
    return z.array(experiencePublicSchema).parse(data)
})
