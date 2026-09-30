import { z } from "zod"

// Client-safe cover letter input schema (admin forms + API).

export const coverLetterInputSchema = z.object({
    resume_id: z.uuid().nullish().transform(value => value ?? null),
    title: z.string().trim().min(1, "Give the letter a name").max(120),
    company: z.string().trim().max(120).nullish().transform(value => value || null),
    job_title: z.string().trim().max(120).nullish().transform(value => value || null),
    recipient: z.string().trim().max(300).nullish().transform(value => value || null),
    letter_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").nullish().transform(value => value || null),
    body: z.string().max(10000, "Max 10,000 characters"),
})

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>

export const COVER_TONES = ["professional", "warm", "confident", "concise"] as const
