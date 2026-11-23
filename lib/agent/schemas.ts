import { z } from "zod"

// Client-safe request/response shapes for the admin assistant (no server-only imports).

export const AGENT_TYPES = [
    "project", "technology", "experience", "testimonial", "about_fact", "gallery_photo", "blog_post", "job", "inquiry",
    "about_page", "gallery_page", "blog_page", "project_form",
] as const

export const MESSAGE_MAX = 4000
export const HISTORY_MAX = 12

export const chatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(MESSAGE_MAX),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>

export const agentRequestSchema = z.object({
    messages: z
        .array(chatMessageSchema)
        .min(1)
        .max(HISTORY_MAX + 1)
        .refine(messages => messages[messages.length - 1]?.role === "user", "The last message must be from the user"),
})

const diffSchema = z.object({
    field: z.string().max(80),
    before: z.string().max(400),
    after: z.string().max(400),
})

export type ProposalDiff = z.infer<typeof diffSchema>

export const proposalSchema = z.object({
    id: z.uuid(),
    type: z.enum(AGENT_TYPES),
    op: z.enum(["create", "update", "delete", "toggle"]),
    targetId: z.uuid().optional(),
    label: z.string().max(200),
    summary: z.string().max(300),
    diff: z.array(diffSchema).max(80),
    payload: z.record(z.string(), z.unknown()),
})

export type Proposal = z.infer<typeof proposalSchema>

export const confirmRequestSchema = z.object({ proposal: proposalSchema })

export type AgentUsage = { used: number, limit: number, model: string }
export type AgentReply = { reply: string, proposals: Proposal[], usage: AgentUsage }
