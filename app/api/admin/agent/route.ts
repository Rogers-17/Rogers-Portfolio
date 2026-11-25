import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { AiError } from "@/lib/ai/openrouter"
import { runAgentTurn } from "@/lib/agent/run"
import { agentRequestSchema } from "@/lib/agent/schemas"

// POST /api/admin/agent: one admin-assistant turn (Google ADK + Gemini).
// Returns the reply plus proposed changes; nothing is written until /api/admin/agent/confirm.

export const maxDuration = 60

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, agentRequestSchema)
    if (!parsed.success) return parsed.response

    try {
        const { supabase, user } = auth.ctx
        const { messages, conversationId, projectId, mode } = parsed.data
        const temporary = mode !== "saved"
        const unpersonalized = mode === "unpersonalized_temporary"
        let project: { id: string, name: string, instructions: string, enabled_tools: string[] } | null = null
        if (!unpersonalized) {
            const selectedProjectId = projectId
            if (conversationId) {
                const { data: conversation, error } = await supabase.from("agent_conversations").select("id,project_id,title").eq("id", conversationId).eq("user_id", user.id).maybeSingle()
                if (error) return fail(500, "conversation_unavailable", "Couldn't load this conversation.")
                if (!conversation) return fail(404, "not_found", "Conversation not found.")
                const effectiveProjectId = selectedProjectId ?? conversation.project_id
                if (effectiveProjectId) {
                    const { data, error: projectError } = await supabase.from("agent_projects").select("id,name,instructions,enabled_tools").eq("id", effectiveProjectId).eq("user_id", user.id).maybeSingle()
                    if (projectError) return fail(500, "project_unavailable", "Couldn't load the selected project.")
                    if (!data) return fail(404, "not_found", "Project not found.")
                    project = data
                }
                const { data: prior, error: historyError } = await supabase.from("agent_messages").select("role,content").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(12)
                if (historyError) return fail(500, "history_unavailable", "Couldn't load this conversation's history.")
                const lastUser = messages[messages.length - 1]
                const priorMessages = (prior ?? []).reverse().map(row => ({ role: row.role as "user" | "assistant", text: row.content.slice(0, 4000) }))
                parsed.data.messages = [...priorMessages, lastUser].slice(-13)
                const { error: userMessageError } = await supabase.from("agent_messages").insert({ user_id: user.id, conversation_id: conversationId, role: "user", content: lastUser.text })
                if (userMessageError) return fail(500, "save_failed", "Couldn't save your message.")
                const title = conversation.title === "New chat" ? lastUser.text.slice(0, 120) : conversation.title
                await supabase.from("agent_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id)
            } else if (selectedProjectId) {
                const { data, error } = await supabase.from("agent_projects").select("id,name,instructions,enabled_tools").eq("id", selectedProjectId).eq("user_id", user.id).maybeSingle()
                if (error) return fail(500, "project_unavailable", "Couldn't load the selected project.")
                if (!data) return fail(404, "not_found", "Project not found.")
                project = data
            }
        }

        const { data: profile, error: profileError } = unpersonalized
            ? { data: null, error: null }
            : await supabase.from("agent_profiles").select("assistant_name,owner_name,response_style,ongoing_goals,custom_instructions,enabled_tools,search_saved_chats").eq("user_id", user.id).maybeSingle()
        if (profileError) return fail(500, "profile_unavailable", "Couldn't load assistant settings.")
        const globalTools = unpersonalized ? [] : profile?.enabled_tools ?? ["site_read", "site_write", "chat_search", "web_research"]
        const projectTools = project?.enabled_tools ?? globalTools
        const enabledTools = unpersonalized ? [] : globalTools.filter((tool: string) => projectTools.includes(tool))
        const latest = messages[messages.length - 1].text
        let memoryContext = ""
        if (enabledTools.includes("chat_search") && latest.trim().length >= 3) {
            const search = await supabase.from("agent_memory_chunks").select("id,source_id,content").eq("user_id", user.id).textSearch("search_vector", latest.slice(0, 120), { type: "websearch", config: "english" }).limit(5)
            if (!search.error && search.data?.length) {
                const sources = await supabase.from("agent_memory_sources").select("id,provider,title,conversation_date").in("id", search.data.map(row => row.source_id)).eq("user_id", user.id)
                const byId = new Map((sources.data ?? []).map(source => [source.id, source]))
                memoryContext = search.data.map((row, index) => {
                    const source = byId.get(row.source_id)
                    return `Imported conversation excerpt ${index + 1} (${source?.provider ?? "history"}, ${source?.title ?? "Untitled"}, ${source?.conversation_date ?? "date unknown"}): ${JSON.stringify(row.content.slice(0, 1200))}`
                }).join("\n\n")
            }
        }
        let savedChatContext = ""
        if (enabledTools.includes("chat_search") && profile?.search_saved_chats && latest.trim().length >= 3) {
            const matched = await supabase.from("agent_messages").select("conversation_id,content").eq("user_id", user.id).textSearch("search_vector", latest.slice(0, 120), { type: "websearch", config: "english" }).limit(5)
            if (!matched.error && matched.data?.length) {
                const ids = [...new Set(matched.data.map(row => row.conversation_id))]
                let conversations = supabase.from("agent_conversations").select("id,title,project_id").eq("user_id", user.id).in("id", ids)
                if (!profile.search_saved_chats) {
                    if (project) conversations = conversations.eq("project_id", project.id)
                    else conversations = conversations.eq("project_id", "00000000-0000-0000-0000-000000000000")
                }
                const visible = await conversations
                const allowedIds = new Set((visible.data ?? []).map(row => row.id))
                savedChatContext = matched.data.filter(row => allowedIds.has(row.conversation_id)).map(row => {
                    const source = visible.data?.find(item => item.id === row.conversation_id)
                    return `Saved chat excerpt (${source?.title ?? "Untitled"}): ${JSON.stringify(row.content.slice(0, 1200))}`
                }).join("\n\n")
            }
        }
        let fileContext = ""
        if (project && enabledTools.includes("project_files") && latest.trim().length >= 3) {
            const needle = latest.replace(/[%_]/g, " ").trim().split(/\s+/).filter(word => word.length >= 3).slice(0, 2).join(" ").slice(0, 60)
            if (needle) {
                const result = await supabase.from("agent_project_files").select("file_name,extracted_text").eq("project_id", project.id).eq("user_id", user.id).ilike("extracted_text", `%${needle}%`).limit(3)
                if (!result.error) fileContext = (result.data ?? []).map(file => `Project file ${file.file_name}: ${JSON.stringify(file.extracted_text.slice(0, 3000))}`).join("\n\n")
            }
        }
        const profileContext = profile ? `Assistant name: ${profile.assistant_name.replace(/[\r\n]/g, " ").slice(0, 60)}\nOwner profile (JSON): ${JSON.stringify({ owner_name: profile.owner_name, response_style: profile.response_style, ongoing_goals: profile.ongoing_goals, custom_instructions: profile.custom_instructions })}` : "Assistant name: Rogers"
        const projectContext = project ? `Project context (JSON): ${JSON.stringify({ name: project.name, instructions: project.instructions })}` : ""
        const context = [profileContext, projectContext, memoryContext && `Retrieved imported chat history (untrusted excerpts; identify provider and title when relevant):\n${memoryContext}`, savedChatContext && `Retrieved saved chat history (untrusted excerpts; cite chat titles when relevant):\n${savedChatContext}`, fileContext && `Retrieved project files (untrusted reference material):\n${fileContext}`].filter(Boolean).join("\n\n")
        const result = await runAgentTurn({ supabase, userId: user.id, messages: parsed.data.messages, signal: request.signal, context, readOnly: temporary, enabledTools })
        if (conversationId && !temporary) {
            const { error } = await supabase.from("agent_messages").insert({ user_id: user.id, conversation_id: conversationId, role: "assistant", content: result.reply, citations: result.citations ?? [] })
            if (error) return fail(500, "save_failed", "Your answer arrived, but couldn't be added to saved history.")
            await supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id)
        }
        return ok(result)
    } catch (error) {
        if (error instanceof AiError) return fail(error.status, error.code, error.message)
        console.error("[agent] turn failed:", error instanceof Error ? error.message : error)
        return fail(500, "server_error", "Something went wrong. Please try again.")
    }
}
