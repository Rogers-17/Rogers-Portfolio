"use client"

import * as React from "react"
import { createClient } from "@supabase/supabase-js"
import { FiArchive, FiArrowUp, FiBookOpen, FiClock, FiFileText, FiFolder, FiPlus, FiSearch, FiSettings, FiTrash2, FiZap } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import { HISTORY_MAX, MESSAGE_MAX, type AgentCitation, type AgentReply, type ChatMessage, type Proposal } from "@/lib/agent/schemas"
import ProposalCard, { type CardState } from "@/components/admin/assistant/ProposalCard"

type ToolName = "site_read" | "site_write" | "chat_search" | "project_files" | "web_research" | "github_stats"
type Profile = { assistant_name: string, owner_name: string, response_style: string, ongoing_goals: string, custom_instructions: string, enabled_tools: ToolName[], search_saved_chats: boolean }
type Project = { id: string, name: string, instructions: string, enabled_tools: ToolName[] }
type Conversation = { id: string, project_id: string | null, title: string, archived: boolean, created_at: string }
type Message = { id: string, role: "user" | "assistant", content: string, citations?: AgentCitation[], proposals?: CardState[] }
type Memory = { id: string, provider: string, source_name: string, title: string, conversation_date: string | null, created_at: string }
type Automation = { id: string, project_id: string, name: string, instructions: string, cadence: "daily" | "weekly" | "once", schedule_expression: string, timezone: string, enabled: boolean, next_run_at: string | null, last_run_at: string | null, failure_count: number }
type Workspace = { profile: Profile, projects: Project[], conversations: Conversation[], memories: Memory[], automations: Automation[], automationReady: boolean }
type Normalized = { externalId: string, title: string, date: string | null, text: string }
type Imported = { provider: "chatgpt" | "claude", sourceName: string, conversations: Normalized[], skipped: number }

const TOOLS: { id: ToolName, label: string, detail: string }[] = [
    { id: "site_read", label: "Portfolio content", detail: "Read and find your site content" },
    { id: "site_write", label: "Proposed site changes", detail: "Prepare changes for your review and confirmation" },
    { id: "chat_search", label: "Imported chat memory", detail: "Retrieve matching excerpts from imported chats" },
    { id: "project_files", label: "Project files", detail: "Use searchable files in the selected project" },
    { id: "web_research", label: "Web research", detail: "Use Google Search grounding and source citations" },
    { id: "github_stats", label: "GitHub stats", detail: "Read contribution totals and score" },
]
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
const field = `w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-fg placeholder:text-dim ${focus}`
const blankProfile: Profile = { assistant_name: "Rogers", owner_name: "", response_style: "", ongoing_goals: "", custom_instructions: "", enabled_tools: ["site_read", "site_write", "chat_search", "web_research"], search_saved_chats: false }
const api = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const storageClient = api && anon ? createClient(api, anon, { auth: { persistSession: false, autoRefreshToken: false } }) : null

export default function AssistantWorkspace () {
    const [workspace, setWorkspace] = React.useState<Workspace | null>(null)
    const [tab, setTab] = React.useState<"chat" | "projects" | "memory" | "automations" | "settings">("chat")
    const [notice, setNotice] = React.useState("")
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [projectId, setProjectId] = React.useState("")
    const [messages, setMessages] = React.useState<Message[]>([])
    const [draft, setDraft] = React.useState("")
    const [chatMode, setChatMode] = React.useState<"saved" | "personalized_temporary" | "unpersonalized_temporary">("saved")
    const [busy, setBusy] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [searchResults, setSearchResults] = React.useState<{ query: string, conversations: Conversation[] } | null>(null)
    const [archived, setArchived] = React.useState(false)
    const [profile, setProfile] = React.useState<Profile>(blankProfile)
    const [projectForm, setProjectForm] = React.useState({ name: "", instructions: "" })
    const [memoryProvider, setMemoryProvider] = React.useState<"chatgpt" | "claude">("chatgpt")
    const [importPreview, setImportPreview] = React.useState<Imported | null>(null)
    const [importProgress, setImportProgress] = React.useState("")
    const [inspectedMemory, setInspectedMemory] = React.useState<{ title: string, content: string } | null>(null)
    const [automationForm, setAutomationForm] = React.useState({ name: "Daily research report", instructions: "", cadence: "daily" as "daily" | "weekly" | "once", time: "09:00", runAt: "", weekday: "1", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" })
    const [runs, setRuns] = React.useState<Record<string, unknown>[]>([])
    const [uploadVersion, setUploadVersion] = React.useState(0)

    const refresh = React.useCallback(async () => {
        const result = await adminFetch<Workspace>("/api/admin/agent/workspace")
        if (result.ok) {
            setWorkspace(result.data)
            setProfile(result.data.profile ?? blankProfile)
            setProjectId(current => current || result.data.projects[0]?.id || "")
        } else setNotice(result.error.message)
    }, [])
    React.useEffect(() => {
        let active = true
        async function loadWorkspace () {
            const result = await adminFetch<Workspace>("/api/admin/agent/workspace")
            if (!active) return
            if (result.ok) {
                setWorkspace(result.data)
                setProfile(result.data.profile ?? blankProfile)
                setProjectId(current => current || result.data.projects[0]?.id || "")
            } else setNotice(result.error.message)
        }
        void loadWorkspace()
        return () => { active = false }
    }, [])
    React.useEffect(() => {
        if (!search.trim()) return
        const timer = window.setTimeout(() => {
            const query = search
            void adminFetch<Conversation[]>(`/api/admin/agent/conversations?q=${encodeURIComponent(query)}`).then(result => { if (result.ok) setSearchResults({ query, conversations: result.data }) })
        }, 250)
        return () => window.clearTimeout(timer)
    }, [search])

    const matches = search ? searchResults?.query === search ? searchResults.conversations : [] : workspace?.conversations ?? []
    const shownConversations = matches.filter(item => item.archived === archived)
    async function openConversation (id: string) {
        const result = await adminFetch<Conversation & { messages: Message[] }>(`/api/admin/agent/conversations/${id}`)
        if (!result.ok) { setNotice(result.error.message); return }
        setActiveId(id); setProjectId(result.data.project_id ?? ""); setMessages(result.data.messages); setChatMode("saved"); setTab("chat"); setNotice("")
    }

    async function newSavedChat () {
        const result = await adminFetch<Conversation>("/api/admin/agent/conversations", { json: { projectId: projectId || null } })
        if (!result.ok) { setNotice(result.error.message); return }
        setActiveId(result.data.id); setMessages([]); setChatMode("saved"); await refresh()
    }

    function startTemporary (mode: "personalized_temporary" | "unpersonalized_temporary") {
        setActiveId(null); setMessages([]); setChatMode(mode); setNotice("")
    }

    async function sendMessage (event?: React.FormEvent) {
        event?.preventDefault()
        const text = draft.trim().slice(0, MESSAGE_MAX)
        if (!text || busy) return
        setBusy(true); setDraft(""); setNotice("")
        let conversationId = activeId
        if (chatMode === "saved" && !conversationId) {
            const created = await adminFetch<Conversation>("/api/admin/agent/conversations", { json: { projectId: projectId || null } })
            if (!created.ok) { setBusy(false); setNotice(created.error.message); return }
            conversationId = created.data.id; setActiveId(conversationId)
        }
        const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text }
        const previous = messages
        setMessages(current => [...current, userMessage])
        const history: ChatMessage[] = [...previous.slice(-HISTORY_MAX).map(message => ({ role: message.role, text: message.content.slice(0, MESSAGE_MAX) })), { role: "user", text }]
        const request = await adminFetch<AgentReply>("/api/admin/agent", { json: { messages: history, conversationId: chatMode === "saved" ? conversationId : undefined, projectId: projectId || undefined, mode: chatMode }, signal: AbortSignal.timeout(65000) })
        setBusy(false)
        if (!request.ok) { setNotice(request.error.message); return }
        const answer: Message = { id: crypto.randomUUID(), role: "assistant", content: request.data.reply, citations: request.data.citations, proposals: request.data.proposals.map((proposal: Proposal) => ({ proposal, status: "pending" as const })) }
        setMessages(current => [...current, answer])
        if (chatMode === "saved") await refresh()
    }

    async function saveTemporary () {
        const serializable = messages.filter(message => message.role === "user" || message.role === "assistant").map(message => ({ role: message.role, content: message.content, citations: message.citations ?? [] }))
        if (!serializable.length) return
        const result = await adminFetch<{ id: string }>("/api/admin/agent/conversations/save", { json: { projectId: projectId || null, title: serializable.find(message => message.role === "user")?.content.slice(0, 120) || "Temporary chat", messages: serializable } })
        if (!result.ok) { setNotice(result.error.message); return }
        setActiveId(result.data.id); setChatMode("saved"); setNotice("Temporary conversation saved to history."); await openConversation(result.data.id); await refresh()
    }

    async function confirmProposal (messageId: string, card: CardState) {
        setMessages(current => current.map(message => message.id === messageId ? { ...message, proposals: message.proposals?.map(item => item.proposal.id === card.proposal.id ? { ...item, status: "confirming" } : item) } : message))
        const result = await adminFetch<{ label: string }>("/api/admin/agent/confirm", { json: { proposal: card.proposal } })
        setMessages(current => current.map(message => message.id === messageId ? { ...message, proposals: message.proposals?.map(item => item.proposal.id === card.proposal.id ? { ...item, status: result.ok ? "done" : "pending", error: result.ok ? undefined : result.error.message } : item) } : message))
        if (!result.ok) setNotice(result.error.message)
    }

    async function conversationAction (id: string, action: "archive" | "delete", isArchived = false) {
        const result = await adminFetch(`/api/admin/agent/conversations/${id}`, { json: action === "archive" ? { action, archived: !isArchived } : { action: "delete" } })
        if (!result.ok) setNotice(result.error.message)
        else { if (id === activeId) { setActiveId(null); setMessages([]) }; await refresh() }
    }

    async function saveProfile (event: React.FormEvent) {
        event.preventDefault()
        const result = await adminFetch<Profile>("/api/admin/agent/profile", { json: profile })
        if (!result.ok) setNotice(result.error.message); else { setProfile(result.data); setNotice("Assistant settings saved.") }
    }

    async function createProject (event: React.FormEvent) {
        event.preventDefault()
        const result = await adminFetch<Project>("/api/admin/agent/projects", { json: { ...projectForm, enabled_tools: ["site_read", "site_write", "chat_search", "project_files", "web_research"] } })
        if (!result.ok) setNotice(result.error.message)
        else { setProjectForm({ name: "", instructions: "" }); setProjectId(result.data.id); setNotice("Project created."); await refresh() }
    }

    async function saveProject (project: Project, changes: Partial<Project>) {
        const result = await adminFetch<Project>(`/api/admin/agent/projects/${project.id}`, { json: { action: "update", ...changes } })
        if (!result.ok) setNotice(result.error.message); else { setNotice("Project saved."); await refresh() }
    }

    async function uploadProjectFile (project: Project, file: File) {
        if (!storageClient) { setNotice("Supabase client configuration is missing."); return }
        const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.name.toLowerCase().endsWith(".md") ? "text/markdown" : "text/plain")
        if (!["text/plain", "text/markdown", "application/pdf"].includes(type)) { setNotice("Upload a TXT, MD, or PDF file."); return }
        const signed = await adminFetch<{ path: string, token: string, contentType: string }>(`/api/admin/agent/projects/${project.id}/files/sign`, { json: { fileName: file.name, contentType: type, size: file.size } })
        if (!signed.ok) { setNotice(signed.error.message); return }
        const uploaded = await storageClient.storage.from("agent-project-files").uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: signed.data.contentType })
        if (uploaded.error) { setNotice("The private file upload failed."); return }
        const saved = await adminFetch(`/api/admin/agent/projects/${project.id}/files`, { json: { path: signed.data.path, fileName: file.name, contentType: type, size: file.size } })
        if (!saved.ok) setNotice(saved.error.message); else { setNotice("Project file uploaded and indexed."); setUploadVersion(version => version + 1) }
    }

    async function chooseMemoryFile (file: File | undefined) {
        setImportPreview(null); setNotice("")
        if (!file) return
        try {
            if (file.size > 50 * 1024 * 1024) throw new Error("Choose an export under 50 MB.")
            const parsed = await parseHistoryExport(file, memoryProvider)
            setImportPreview({ provider: memoryProvider, sourceName: file.name, conversations: parsed.conversations, skipped: parsed.skipped })
        } catch (error) { setNotice(error instanceof Error ? error.message : "Could not read this export.") }
    }

    async function importMemory () {
        if (!importPreview) return
        let imported = 0
        for (const [index, conversation] of importPreview.conversations.entries()) {
            const chunks = splitText(conversation.text, 12000)
            if (!chunks.length || chunks.length > 200) { setImportProgress(`Skipped an oversized conversation (${index + 1}/${importPreview.conversations.length}).`); continue }
            const result = await adminFetch("/api/admin/agent/memories/import", { json: { provider: importPreview.provider, sourceName: importPreview.sourceName, externalId: conversation.externalId, title: conversation.title, conversationDate: conversation.date, chunks } })
            if (!result.ok) { setImportProgress(`Stopped at conversation ${index + 1}: ${result.error.message}`); return }
            imported++
            setImportProgress(`Imported ${imported} of ${importPreview.conversations.length} conversations…`)
        }
        setImportProgress(`Import complete: ${imported} imported; ${importPreview.skipped} unsupported records skipped.`); setImportPreview(null); await refresh()
    }

    async function inspectMemory (memory: Memory) {
        const result = await adminFetch<{ title: string, content: string }>(`/api/admin/agent/memories/conversation?id=${memory.id}`)
        if (result.ok) setInspectedMemory(result.data); else setNotice(result.error.message)
    }
    async function deleteMemory (memory: Memory) {
        const result = await adminFetch("/api/admin/agent/memories/delete", { json: { sourceId: memory.id } })
        if (!result.ok) setNotice(result.error.message); else { setNotice("Imported conversation removed."); await refresh() }
    }

    async function createAutomation (event: React.FormEvent) {
        event.preventDefault()
        if (!projectId) { setNotice("Create or select a project first."); return }
        const [hour, minute] = automationForm.time.split(":").map(Number)
        const result = await adminFetch("/api/admin/agent/automations", { json: { name: automationForm.name, instructions: automationForm.instructions, projectId, cadence: automationForm.cadence, hour, minute, weekday: Number(automationForm.weekday), runAt: automationForm.runAt, timezone: automationForm.timezone } })
        if (!result.ok) setNotice(result.error.message); else { setNotice("Research automation scheduled."); await refresh() }
    }
    async function automationAction (automation: Automation, action: "pause" | "enable" | "delete" | "run_now") {
        const result = await adminFetch(`/api/admin/agent/automations/${automation.id}`, { json: { action } })
        if (!result.ok) setNotice(result.error.message); else { setNotice(action === "run_now" ? "Research run completed. The report was saved to its project." : `Automation ${action === "delete" ? "deleted" : action === "pause" ? "paused" : "updated"}.`); await refresh() }
    }
    async function loadRuns (automation: Automation) {
        const result = await adminFetch<Record<string, unknown>[]>(`/api/admin/agent/automations/${automation.id}/runs`)
        if (result.ok) setRuns(result.data); else setNotice(result.error.message)
    }

    const nav = [
        { id: "chat" as const, label: "Chat", icon: FiZap }, { id: "projects" as const, label: "Projects & tools", icon: FiFolder },
        { id: "memory" as const, label: "Chat memory", icon: FiBookOpen }, { id: "automations" as const, label: "Automations", icon: FiClock }, { id: "settings" as const, label: "Assistant settings", icon: FiSettings },
    ]

    return <main className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.2em] text-accent-1 uppercase">Personal assistant</p><h1 className="mt-1 text-2xl font-bold text-fg sm:text-3xl">{profile.assistant_name || "Rogers"}</h1><p className="mt-1 text-sm text-muted">Your chats, projects, imported memory, tools, and scheduled research.</p></div><span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-dim">Grounded by portfolio data · Gemini</span></div>
        <div className="grid min-h-[76vh] overflow-hidden rounded-3xl border border-white/8 bg-card shadow-2xl shadow-black/20 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="border-b border-white/8 p-3 lg:border-r lg:border-b-0">
                <button type="button" onClick={() => void newSavedChat()} className={`mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-1 to-accent-2 text-sm font-semibold text-white ${focus}`}><FiPlus /> New chat</button>
                <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1" aria-label="Assistant workspace">{nav.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setTab(id)} className={`flex min-h-9 items-center gap-2 rounded-xl px-3 text-left text-xs font-medium ${tab === id ? "bg-white/8 text-white" : "text-muted hover:bg-white/4 hover:text-white"} ${focus}`}><Icon aria-hidden="true" />{label}</button>)}</nav>
                <div className="mt-5"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold tracking-widest text-dim uppercase">History</p><button type="button" onClick={() => setArchived(value => !value)} className="rounded p-1 text-dim hover:text-white" title={archived ? "Show active chats" : "Show archived chats"}><FiArchive /></button></div><label className="relative mt-2 block"><FiSearch className="absolute top-3 left-3 text-dim" /><input value={search} onChange={event => setSearch(event.target.value)} className={`${field} pl-9 text-xs`} placeholder="Search chats and messages" /></label><div className="mt-2 max-h-[48vh] space-y-1 overflow-y-auto">{shownConversations.map(item => <div key={item.id} className={`group flex items-center rounded-lg ${activeId === item.id ? "bg-white/6" : "hover:bg-white/4"}`}><button type="button" onClick={() => void openConversation(item.id)} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-xs text-muted hover:text-white">{item.title}</button><button type="button" onClick={() => { const title = window.prompt("Rename conversation", item.title); if (title?.trim()) void adminFetch(`/api/admin/agent/conversations/${item.id}`, { json: { action: "rename", title: title.trim() } }).then(result => result.ok ? refresh() : setNotice(result.error.message)) }} className="p-2 text-dim opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Rename conversation">✎</button><button type="button" onClick={() => void conversationAction(item.id, "archive", item.archived)} className="p-2 text-dim opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={item.archived ? "Restore conversation" : "Archive conversation"}><FiArchive /></button><button type="button" onClick={() => void conversationAction(item.id, "delete")} className="p-2 text-dim opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Delete conversation"><FiTrash2 /></button></div>)}{shownConversations.length === 0 && <p className="px-2 py-2 text-xs text-dim">No chats found.</p>}</div></div>
                <div className="mt-4 hidden rounded-xl border border-white/6 bg-black/10 p-3 text-[11px] leading-5 text-dim lg:block">Temporary chats stay out of saved history. Personalized temporary chats can read enabled memory and project context; unpersonalized chats skip them. Both are read-only.</div>
            </aside>

            <section className="min-w-0 p-4 sm:p-6">
                {notice && <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-sm text-muted"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="text-dim">×</button></div>}
                {tab === "chat" && <div className="flex min-h-[68vh] flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3"><div><h2 className="font-semibold text-fg">{chatMode === "saved" ? (workspace?.conversations.find(item => item.id === activeId)?.title ?? "New chat") : chatMode === "personalized_temporary" ? "Temporary · personalized" : "Temporary · unpersonalized"}</h2><p className="mt-1 text-xs text-dim">{chatMode === "saved" ? "Saved conversation" : "Not written to this app’s conversation history"}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Project context" value={projectId} onChange={event => { const next = event.target.value; setProjectId(next); if (activeId && chatMode === "saved") void adminFetch(`/api/admin/agent/conversations/${activeId}`, { json: { action: "assign_project", projectId: next || null } }).then(result => { if (!result.ok) setNotice(result.error.message) }) }} disabled={chatMode === "unpersonalized_temporary"} className={`${field} w-auto max-w-44 text-xs`}><option value="">No project</option>{(workspace?.projects ?? []).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select aria-label="Chat type" value={chatMode} onChange={event => event.target.value === "saved" ? (setChatMode("saved"), setActiveId(null), setMessages([])) : startTemporary(event.target.value as "personalized_temporary" | "unpersonalized_temporary")} className={`${field} w-auto text-xs`}><option value="saved">Saved chat</option><option value="personalized_temporary">Temporary · personalized</option><option value="unpersonalized_temporary">Temporary · unpersonalized</option></select>{chatMode !== "saved" && messages.length > 0 && <button onClick={() => void saveTemporary()} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-muted hover:text-white ${focus}`}>Save chat</button>}</div></div>
                    <div className="flex-1 space-y-4 overflow-y-auto py-5" aria-live="polite">{messages.length === 0 && <div className="mx-auto mt-16 max-w-xl text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-1/10 text-accent-1"><FiZap /></div><h3 className="mt-4 text-xl font-semibold text-fg">What can I help you with?</h3><p className="mt-2 text-sm text-muted">Ask about your portfolio, import relevant chat memories, research the web with citations, or draft your next idea.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["Summarize my portfolio projects", "Research the latest Next.js changes", "Help me plan this week's priorities"].map(example => <button key={example} onClick={() => setDraft(example)} className={`rounded-full border border-white/8 px-3 py-2 text-xs text-muted hover:bg-white/4 hover:text-white ${focus}`}>{example}</button>)}</div></div>}
                        {messages.map(message => <article key={message.id} className={`max-w-4xl ${message.role === "user" ? "ml-auto" : "mr-auto"}`}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-white/7 text-fg" : "bg-black/15 text-fg"}`}><p className="mb-1 text-[10px] font-semibold tracking-wider text-dim uppercase">{message.role === "user" ? "You" : chatMode === "unpersonalized_temporary" ? "Assistant" : profile.assistant_name || "Rogers"}</p><p className="whitespace-pre-wrap break-words">{message.content}</p>{message.citations?.length ? <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-2">{message.citations.map(citation => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer" className={`rounded-full border border-white/10 px-2.5 py-1 text-xs text-accent-1 hover:bg-white/5 ${focus}`}>{citation.title}</a>)}</div> : null}</div>
                            {message.proposals?.map(card => <div key={card.proposal.id} className="mt-3"><ProposalCard card={card} onDiscard={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, proposals: item.proposals?.map(proposal => proposal.proposal.id === card.proposal.id ? { ...proposal, status: "discarded" } : proposal) } : item))} onConfirm={() => void confirmProposal(message.id, card)} /></div>)}
                        </article>)}
                        {busy && <p className="text-sm text-muted">{profile.assistant_name || "Rogers"} is thinking…</p>}
                    </div>
                    <form onSubmit={sendMessage} className="rounded-2xl border border-white/10 bg-black/20 p-2"><label className="sr-only" htmlFor="assistant-composer">Message the assistant</label><textarea id="assistant-composer" value={draft} onChange={event => setDraft(event.target.value)} maxLength={MESSAGE_MAX} rows={2} placeholder="Message your assistant…" className="max-h-40 min-h-14 w-full resize-y bg-transparent px-3 py-2 text-sm text-fg outline-none placeholder:text-dim" onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage() } }} /><div className="flex items-center justify-between px-2 pb-1"><span className="text-[10px] text-dim">{draft.length}/{MESSAGE_MAX} · Enter to send</span><button disabled={busy || !draft.trim()} className={`inline-flex size-9 items-center justify-center rounded-xl bg-linear-to-r from-accent-1 to-accent-2 text-white disabled:opacity-50 ${focus}`} aria-label="Send message"><FiArrowUp /></button></div></form>
                    {chatMode !== "saved" && <p className="mt-2 text-[11px] text-dim">Temporary content is not stored in this app’s chat history. Aggregate AI usage counts may be saved, and Gemini’s processing terms apply separately.</p>}
                </div>}

                {tab === "projects" && <div className="space-y-5"><div><h2 className="text-xl font-semibold text-fg">Projects and tools</h2><p className="mt-1 text-sm text-muted">Projects hold instructions, enabled tools, reference files, and chats. Tool access comes from this allowlist.</p></div><form onSubmit={createProject} className="grid gap-3 rounded-2xl border border-white/8 bg-black/10 p-4"><h3 className="font-semibold text-fg">Create a project</h3><input required value={projectForm.name} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} className={field} placeholder="Project name" /><textarea value={projectForm.instructions} onChange={event => setProjectForm({ ...projectForm, instructions: event.target.value })} className={field} rows={3} placeholder="Project-specific context and instructions" /><button className={`w-fit rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-white hover:bg-white/12 ${focus}`}>Create project</button></form>
                    <div className="space-y-3">{(workspace?.projects ?? []).map(project => <ProjectPanel key={`${project.id}-${uploadVersion}`} project={project} isSelected={project.id === projectId} onSelect={() => setProjectId(project.id)} onSave={changes => saveProject(project, changes)} onUpload={file => void uploadProjectFile(project, file)} onNotice={setNotice} onDelete={() => { if (!window.confirm(`Delete ${project.name}? Its private files and scheduled reports will be removed; saved chats remain.`)) return; void adminFetch(`/api/admin/agent/projects/${project.id}`, { json: { action: "delete" } }).then(result => { if (!result.ok) setNotice(result.error.message); else { if (projectId === project.id) setProjectId(""); setNotice("Project deleted."); void refresh() } }) }} />)}{!workspace?.projects.length && <p className="text-sm text-dim">No projects yet. Create one to add files, instructions, and saved chats.</p>}</div></div>}

                {tab === "memory" && <div className="space-y-5"><div><h2 className="text-xl font-semibold text-fg">Chat history memory</h2><p className="mt-1 text-sm text-muted">Import an export to searchable private memory. This personalizes retrieval; it does not fine-tune model weights.</p></div><div className="rounded-2xl border border-amber-200/15 bg-amber-200/5 p-4 text-sm leading-6 text-amber-50/80">Import stores supported user and assistant text in this Supabase project. Matching excerpts may be sent to Gemini when memory search is enabled. Raw archives and attachments stay in your browser and are not uploaded. You can inspect and delete each source below.</div><div className="grid gap-3 rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex flex-wrap gap-3"><label className="text-xs text-muted">Export provider<select value={memoryProvider} onChange={event => { const next = event.target.value as "chatgpt" | "claude"; setMemoryProvider(next); setImportPreview(null) }} className={`${field} mt-1`}><option value="chatgpt">ChatGPT</option><option value="claude">Claude</option></select></label><label className="text-xs text-muted">Export file<input type="file" accept=".json,.zip,application/json,application/zip" onChange={event => void chooseMemoryFile(event.target.files?.[0])} className={`${field} mt-1`} /></label></div>{importPreview && <div className="rounded-xl border border-white/8 p-3 text-sm text-muted">Detected <strong className="text-fg">{importPreview.conversations.length}</strong> conversations. {importPreview.skipped} unsupported records will be skipped. Each conversation is previewed by title during import; start only when ready.<button type="button" onClick={() => void importMemory()} disabled={Boolean(importProgress.startsWith("Importing"))} className={`ml-3 rounded-lg bg-accent-1/15 px-3 py-2 text-xs font-semibold text-accent-1 disabled:opacity-50 ${focus}`}>Import detected conversations</button></div>}{importProgress && <p role="status" className="text-xs text-muted">{importProgress}</p>}</div><div className="space-y-2"><h3 className="text-sm font-semibold text-fg">Imported sources ({workspace?.memories.length ?? 0})</h3>{(workspace?.memories ?? []).map(memory => <article key={memory.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 p-3"><div><p className="text-sm font-medium text-fg">{memory.title}</p><p className="mt-1 text-xs text-dim">{memory.provider} · {memory.source_name} · {memory.conversation_date ? new Date(memory.conversation_date).toLocaleDateString() : "date unknown"}</p></div><div className="flex gap-2"><button onClick={() => void inspectMemory(memory)} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-muted hover:text-white ${focus}`}>Inspect full transcript</button><button onClick={() => void deleteMemory(memory)} className={`rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-200 ${focus}`}>Delete</button></div></article>)}</div></div>}

                {tab === "automations" && <div className="space-y-5"><div><h2 className="text-xl font-semibold text-fg">Scheduled research</h2><p className="mt-1 text-sm text-muted">Reports run in the background and are saved as chats in a project. They can research and summarize; they cannot change site data or act in other accounts.</p></div>{!workspace?.automationReady && <div className="rounded-xl border border-amber-200/15 bg-amber-200/5 p-4 text-sm text-amber-50/80">Background schedules need <code>CRON_SECRET</code> and <code>SUPABASE_SECRET_KEY</code> configured in the deployment. Add both, deploy, then create or enable schedules.</div>}<form onSubmit={createAutomation} className="grid gap-3 rounded-2xl border border-white/8 bg-black/10 p-4"><h3 className="font-semibold text-fg">New research report</h3><input value={automationForm.name} onChange={event => setAutomationForm({ ...automationForm, name: event.target.value })} className={field} placeholder="Report name" required /><textarea value={automationForm.instructions} onChange={event => setAutomationForm({ ...automationForm, instructions: event.target.value })} className={field} rows={3} placeholder="What should the agent research and report?" required /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select value={projectId} onChange={event => setProjectId(event.target.value)} className={field}><option value="">Save report in project…</option>{workspace?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={automationForm.cadence} onChange={event => setAutomationForm({ ...automationForm, cadence: event.target.value as "daily" | "weekly" })} className={field}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="once">One time</option></select>{automationForm.cadence === "once" ? <input type="datetime-local" value={automationForm.runAt} onChange={event => setAutomationForm({ ...automationForm, runAt: event.target.value })} className={field} /> : <input type="time" value={automationForm.time} onChange={event => setAutomationForm({ ...automationForm, time: event.target.value })} className={field} />}<input value={automationForm.timezone} onChange={event => setAutomationForm({ ...automationForm, timezone: event.target.value })} className={field} placeholder="IANA timezone, e.g. Africa/Monrovia" /></div>{automationForm.cadence === "weekly" && <select value={automationForm.weekday} onChange={event => setAutomationForm({ ...automationForm, weekday: event.target.value })} className={field}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select>}<button disabled={!workspace?.automationReady} className={`w-fit rounded-xl bg-linear-to-r from-accent-1 to-accent-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${focus}`}>Schedule report</button><p className="text-xs text-dim">The deployment checks for due reports every 15 minutes. Actual delivery can vary with Vercel’s schedule window and plan limits.</p></form><div className="space-y-3">{workspace?.automations.map(automation => <article key={automation.id} className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-fg">{automation.name}</p><p className="mt-1 text-xs text-muted">{automation.cadence} · {automation.schedule_expression} · {automation.timezone}</p><p className="mt-1 text-xs text-dim">{automation.enabled ? `Next run ${automation.next_run_at ? new Date(automation.next_run_at).toLocaleString() : "queued"}` : "Paused"}{automation.failure_count ? ` · ${automation.failure_count} consecutive failures` : ""}</p></div><div className="flex flex-wrap gap-2"><button disabled={!automation.enabled} title={!automation.enabled ? "Enable this schedule before running it" : "Run report now"} onClick={() => void automationAction(automation, "run_now")} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-muted disabled:opacity-40 ${focus}`}>Run now</button><button onClick={() => void automationAction(automation, automation.enabled ? "pause" : "enable")} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-muted ${focus}`}>{automation.enabled ? "Pause" : "Enable"}</button><button onClick={() => void loadRuns(automation)} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-muted ${focus}`}>Run history</button><button onClick={() => void automationAction(automation, "delete")} className={`rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-200 ${focus}`}>Delete</button></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{automation.instructions}</p></article>)}</div>{runs.length > 0 && <section className="rounded-2xl border border-white/8 p-4"><h3 className="mb-2 font-semibold text-fg">Recent runs</h3>{runs.map(run => <details key={String(run.id)} className="border-t border-white/8 py-2"><summary className="cursor-pointer text-xs text-muted">{String(run.status)} · {String(run.report_title ?? run.error_summary ?? run.created_at)}</summary>{typeof run.report_content === "string" && <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-fg">{run.report_content}</pre>}</details>)}</section>}</div>}

                {tab === "settings" && <form onSubmit={saveProfile} className="max-w-3xl space-y-4"><div><h2 className="text-xl font-semibold text-fg">Assistant settings</h2><p className="mt-1 text-sm text-muted">These details personalize future requests. This is retrieval and instructions, not model training.</p></div><Field label="Assistant name"><input value={profile.assistant_name} onChange={event => setProfile({ ...profile, assistant_name: event.target.value })} className={field} maxLength={60} /></Field><Field label="What should it call you?"><input value={profile.owner_name} onChange={event => setProfile({ ...profile, owner_name: event.target.value })} className={field} maxLength={100} /></Field><Field label="Response style"><textarea value={profile.response_style} onChange={event => setProfile({ ...profile, response_style: event.target.value })} className={field} rows={3} maxLength={2000} placeholder="Tone, length, formatting preferences" /></Field><Field label="Ongoing goals and context"><textarea value={profile.ongoing_goals} onChange={event => setProfile({ ...profile, ongoing_goals: event.target.value })} className={field} rows={4} maxLength={5000} /></Field><Field label="Custom instructions and boundaries"><textarea value={profile.custom_instructions} onChange={event => setProfile({ ...profile, custom_instructions: event.target.value })} className={field} rows={4} maxLength={5000} /></Field><fieldset className="rounded-2xl border border-white/8 p-4"><legend className="px-1 text-sm font-semibold text-fg">Saved chat search</legend><label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" checked={profile.search_saved_chats} onChange={event => setProfile({ ...profile, search_saved_chats: event.target.checked })} className="mt-1 accent-fuchsia-500" /><span>Allow searches across all saved chats when chat memory is enabled. When off, search stays within the selected project.</span></label></fieldset><fieldset className="rounded-2xl border border-white/8 p-4"><legend className="px-1 text-sm font-semibold text-fg">Enabled tools</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">{TOOLS.map(tool => <ToolToggle key={tool.id} tool={tool} checked={profile.enabled_tools.includes(tool.id)} onChange={checked => setProfile({ ...profile, enabled_tools: checked ? [...new Set([...profile.enabled_tools, tool.id])] : profile.enabled_tools.filter(item => item !== tool.id) })} />)}</div></fieldset><p className="rounded-xl bg-white/3 p-3 text-xs leading-5 text-muted">Imported excerpts and project files may be sent to Gemini only when retrieved for a request. Web search uses Google grounding and may count against model-specific quota or cost. All requests count against the shared daily AI limit. Temporary chats use aggregate AI usage accounting, but chat text is not saved by this app.</p><button className={`rounded-xl bg-linear-to-r from-accent-1 to-accent-2 px-5 py-2.5 text-sm font-semibold text-white ${focus}`}>Save assistant settings</button></form>}
            </section>
        </div>
        {inspectedMemory && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Imported transcript"><section className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-card p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-fg">{inspectedMemory.title}</h2><button onClick={() => setInspectedMemory(null)} className={`rounded-lg px-3 py-2 text-sm text-muted hover:text-white ${focus}`}>Close</button></div><pre className="mt-4 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-fg">{inspectedMemory.content}</pre></section></div>}
    </main>
}

function Field ({ label, children }: { label: string, children: React.ReactNode }) { return <label className="block text-xs font-medium text-muted">{label}<div className="mt-1.5">{children}</div></label> }

function ToolToggle ({ tool, checked, onChange }: { tool: typeof TOOLS[number], checked: boolean, onChange: (checked: boolean) => void }) {
    return <label className="flex items-start gap-2 rounded-xl border border-white/6 p-3"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 accent-fuchsia-500" /><span><span className="block text-sm font-medium text-fg">{tool.label}</span><span className="mt-0.5 block text-xs text-dim">{tool.detail}</span></span></label>
}

function ProjectPanel ({ project, isSelected, onSelect, onSave, onUpload, onNotice, onDelete }: { project: Project, isSelected: boolean, onSelect: () => void, onSave: (changes: Partial<Project>) => void, onUpload: (file: File) => void, onNotice: (value: string) => void, onDelete: () => void }) {
    const [name, setName] = React.useState(project.name)
    const [instructions, setInstructions] = React.useState(project.instructions)
    const [files, setFiles] = React.useState<{ id: string, file_name: string, size_bytes: number }[]>([])
    React.useEffect(() => { void adminFetch<typeof files>(`/api/admin/agent/projects/${project.id}/files`).then(result => { if (result.ok) setFiles(result.data) }) }, [project.id])
    return <article className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-fg">{project.name}</h3><button type="button" onClick={onSelect} className={`rounded-lg border px-3 py-2 text-xs ${isSelected ? "border-accent-1/40 text-accent-1" : "border-white/10 text-muted"} ${focus}`}>{isSelected ? "Selected for chat" : "Use in chat"}</button></div><div className="mt-3 grid gap-3"><input value={name} onChange={event => setName(event.target.value)} className={field} aria-label="Project name" /><textarea value={instructions} onChange={event => setInstructions(event.target.value)} className={field} rows={3} aria-label="Project instructions" /><fieldset><legend className="mb-2 text-xs font-semibold text-muted">Project tools</legend><div className="grid gap-2 sm:grid-cols-2">{TOOLS.map(tool => <label key={tool.id} className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={project.enabled_tools.includes(tool.id)} onChange={event => { const next = event.target.checked ? [...new Set([...project.enabled_tools, tool.id])] : project.enabled_tools.filter(item => item !== tool.id); onSave({ enabled_tools: next }) }} className="accent-fuchsia-500" />{tool.label}</label>)}</div></fieldset><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onSave({ name, instructions })} className={`rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold text-white ${focus}`}>Save project</button><button type="button" onClick={onDelete} className={`rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-200 ${focus}`}>Delete project</button><label className={`cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs text-muted ${focus}`}>Add TXT / MD / PDF<input type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = "" }} /></label></div><div className="space-y-1">{files.map(file => <div key={file.id} className="flex items-center justify-between text-xs text-dim"><span className="flex items-center gap-2"><FiFileText />{file.file_name} · {Math.ceil(file.size_bytes / 1024)} KB</span><button type="button" onClick={async () => { const result = await adminFetch(`/api/admin/agent/projects/${project.id}/files/${file.id}`, { json: {} }); if (!result.ok) onNotice(result.error.message); else setFiles(current => current.filter(item => item.id !== file.id)) }} className="text-rose-200">Remove</button></div>)}</div></div></article>
}

function splitText (text: string, size: number) { const chunks: string[] = []; for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size)); return chunks }

async function parseHistoryExport (file: File, provider: "chatgpt" | "claude") {
    let parsedFiles: { name: string, text: string }[]
    if (file.name.toLowerCase().endsWith(".zip")) parsedFiles = await unzipJsonFiles(file)
    else if (file.name.toLowerCase().endsWith(".json") || file.type === "application/json") parsedFiles = [{ name: file.name, text: await file.text() }]
    else throw new Error("Choose a JSON or ZIP export file.")
    let conversations: Normalized[] = []
    let skipped = 0
    let supportedShape = false
    for (const entry of parsedFiles) {
        let value: unknown
        try { value = JSON.parse(entry.text) } catch { skipped++; continue }
        const result = normalizeConversations(value, provider)
        supportedShape ||= result.supported
        conversations = conversations.concat(result.conversations)
        skipped += result.skipped
    }
    const unique = [...new Map(conversations.map(item => [item.externalId, item])).values()]
    if (!supportedShape || unique.length === 0) throw new Error("No supported user/assistant conversations were found. Choose the ChatGPT or Claude export JSON file.")
    return { conversations: unique, skipped }
}

function normalizeConversations (raw: unknown, provider: "chatgpt" | "claude") {
    const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
    const list = Array.isArray(raw) ? raw : Array.isArray(root.conversations) ? root.conversations : root.mapping ? [raw] : []
    if (!list.length) return { conversations: [] as Normalized[], skipped: 1, supported: false }
    const conversations: Normalized[] = []
    let skipped = 0
    for (const [index, item] of list.entries()) {
        if (!item || typeof item !== "object") { skipped++; continue }
        const row = item as Record<string, unknown>
        const title = stringValue(row.name ?? row.title) || `Conversation ${index + 1}`
        const externalId = stringValue(row.id ?? row.uuid ?? row.conversation_id) || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}-${index}`
        let messages: { role: "user" | "assistant", text: string, time?: number }[] = []
        if (provider === "chatgpt" && row.mapping && typeof row.mapping === "object") {
            messages = Object.values(row.mapping as Record<string, unknown>).flatMap(node => {
                const message = (node as { message?: Record<string, unknown> } | null)?.message
                if (!message) return []
                const author = message.author as { role?: unknown } | undefined
                const role: "user" | "assistant" | null = author?.role === "user" ? "user" : author?.role === "assistant" ? "assistant" : null
                const content = message.content as { parts?: unknown[], content_type?: unknown } | undefined
                if (content?.content_type && content.content_type !== "text") return []
                const text = Array.isArray(content?.parts) ? content.parts.filter((part): part is string => typeof part === "string").join("\n") : ""
                return role && text.trim() ? [{ role, text: text.trim(), time: typeof message.create_time === "number" ? message.create_time : undefined }] : []
            }).sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
        } else if (provider === "claude" && Array.isArray(row.chat_messages)) {
            messages = row.chat_messages.flatMap(message => {
                if (!message || typeof message !== "object") return []
                const msg = message as Record<string, unknown>
                const sender = stringValue(msg.sender ?? msg.role).toLowerCase()
                const role = sender === "human" || sender === "user" ? "user" : sender === "assistant" ? "assistant" : null
                const text = extractText(msg.text ?? msg.content)
                const time = typeof msg.created_at === "string" ? Date.parse(msg.created_at) / 1000 : undefined
                return role && text.trim() ? [{ role, text: text.trim(), time }] : []
            })
        } else if (Array.isArray(row.messages)) {
            messages = row.messages.flatMap(message => {
                if (!message || typeof message !== "object") return []
                const msg = message as Record<string, unknown>
                const roleValue = stringValue(msg.role ?? msg.sender).toLowerCase()
                const role = roleValue === "user" || roleValue === "human" ? "user" : roleValue === "assistant" ? "assistant" : null
                const text = extractText(msg.content ?? msg.text)
                return role && text.trim() ? [{ role, text: text.trim() }] : []
            })
        }
        if (!messages.length) { skipped++; continue }
        const text = messages.map(message => `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`).join("\n\n")
        if (text.length > 2_400_000) { skipped++; continue }
        const firstTime = messages.find(message => message.time)?.time
        conversations.push({ externalId, title: title.slice(0, 500), date: firstTime && Number.isFinite(firstTime) ? new Date(firstTime * 1000).toISOString() : null, text })
    }
    return { conversations, skipped, supported: true }
}

function stringValue (value: unknown) { return typeof value === "string" ? value.trim() : "" }
function extractText (value: unknown): string {
    if (typeof value === "string") return value
    if (!Array.isArray(value)) return ""
    return value.flatMap(part => typeof part === "string" ? [part] : part && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string" ? [(part as { text: string }).text] : []).join("\n")
}

async function unzipJsonFiles (file: File) {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const view = new DataView(buffer)
    let end = -1
    for (let offset = Math.max(0, bytes.length - 65557); offset <= bytes.length - 22; offset++) if (view.getUint32(offset, true) === 0x06054b50) end = offset
    if (end < 0) throw new Error("This ZIP export is not valid.")
    const count = view.getUint16(end + 10, true)
    let cursor = view.getUint32(end + 16, true)
    const files: { name: string, text: string }[] = []
    let total = 0
    for (let i = 0; i < count && i < 2000; i++) {
        if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("This ZIP export has an unsupported directory.")
        const method = view.getUint16(cursor + 10, true)
        const compressedSize = view.getUint32(cursor + 20, true)
        const uncompressedSize = view.getUint32(cursor + 24, true)
        const nameLength = view.getUint16(cursor + 28, true)
        const extraLength = view.getUint16(cursor + 30, true)
        const commentLength = view.getUint16(cursor + 32, true)
        const localOffset = view.getUint32(cursor + 42, true)
        const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength))
        cursor += 46 + nameLength + extraLength + commentLength
        if (!name.toLowerCase().endsWith(".json") || name.startsWith("__MACOSX/")) continue
        total += uncompressedSize
        if (uncompressedSize > 50 * 1024 * 1024 || total > 100 * 1024 * 1024) throw new Error("The ZIP expands beyond the 100 MB safety limit.")
        const localNameLength = view.getUint16(localOffset + 26, true)
        const localExtraLength = view.getUint16(localOffset + 28, true)
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength
        const compressed = bytes.slice(dataOffset, dataOffset + compressedSize)
        let decoded: ArrayBuffer
        if (method === 0) decoded = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer
        else if (method === 8 && typeof DecompressionStream !== "undefined") {
            const inflater = new (DecompressionStream as unknown as new (format: string) => DecompressionStream)("deflate-raw")
            decoded = await new Response(new Blob([compressed]).stream().pipeThrough(inflater)).arrayBuffer()
        } else throw new Error("This ZIP compression type is not supported by this browser.")
        if (decoded.byteLength !== uncompressedSize) throw new Error("A ZIP entry failed its size check.")
        files.push({ name, text: new TextDecoder("utf-8", { fatal: true }).decode(decoded) })
    }
    if (!files.length) throw new Error("No JSON files were found inside this ZIP export.")
    return files
}
