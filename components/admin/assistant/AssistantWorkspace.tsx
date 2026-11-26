"use client"

import * as React from "react"
import { createClient } from "@supabase/supabase-js"
import type { IconType } from "react-icons"
import { FiArchive, FiArrowUp, FiBookOpen, FiClock, FiEdit2, FiFileText, FiFolder, FiPlus, FiRotateCcw, FiSearch, FiSettings, FiSquare, FiTrash2, FiUpload, FiX, FiZap } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import { HISTORY_MAX, MESSAGE_MAX, type AgentCitation, type AgentReply, type ChatMessage, type Proposal } from "@/lib/agent/schemas"
import ProposalCard, { type CardState } from "@/components/admin/assistant/ProposalCard"
import { Card, SelectField, Switch, TextAreaField, TextField, inputClass, primaryButtonClass } from "@/components/admin/Field"
import { useDialog } from "@/components/admin/Dialog"
import { useToast } from "@/components/admin/Toast"

type ToolName = "site_read" | "site_write" | "chat_search" | "project_files" | "web_research" | "github_stats"
type Profile = { assistant_name: string, owner_name: string, response_style: string, ongoing_goals: string, custom_instructions: string, enabled_tools: ToolName[], search_saved_chats: boolean }
type Project = { id: string, name: string, instructions: string, enabled_tools: ToolName[] }
type Conversation = { id: string, project_id: string | null, title: string, archived: boolean, created_at: string, updated_at?: string }
type ReplyMeta = { ms: number, model: string }
type Message = { id: string, role: "user" | "assistant" | "note", content: string, citations?: AgentCitation[], proposals?: CardState[], fresh?: boolean, meta?: ReplyMeta }
type Memory = { id: string, provider: string, source_name: string, title: string, conversation_date: string | null, created_at: string }
type Automation = { id: string, project_id: string, name: string, instructions: string, cadence: "daily" | "weekly" | "once", schedule_expression: string, timezone: string, enabled: boolean, next_run_at: string | null, last_run_at: string | null, failure_count: number }
type Workspace = { profile: Profile, projects: Project[], conversations: Conversation[], memories: Memory[], automations: Automation[], automationReady: boolean }
type Provider = "chatgpt" | "claude"
type Normalized = { externalId: string, title: string, date: string | null, text: string, provider: Provider }
type Imported = { sourceName: string, conversations: Normalized[], skipped: number, detected: Provider | null }
type ChatMode = "saved" | "personalized_temporary" | "unpersonalized_temporary"
type Tab = "chat" | "projects" | "memory" | "automations" | "settings"

const TOOLS: { id: ToolName, label: string, detail: string }[] = [
    { id: "site_read", label: "Portfolio content", detail: "Read and find your site content" },
    { id: "site_write", label: "Proposed site changes", detail: "Prepare changes for your review and confirmation" },
    { id: "chat_search", label: "Imported chat memory", detail: "Retrieve matching excerpts from imported chats" },
    { id: "project_files", label: "Project files", detail: "Use searchable files in the selected project" },
    { id: "web_research", label: "Web research", detail: "Use Google Search grounding and source citations" },
    { id: "github_stats", label: "GitHub stats", detail: "Read contribution totals and score" },
]
const TABS: { id: Tab, label: string, icon: IconType }[] = [
    { id: "chat", label: "Chat", icon: FiZap },
    { id: "projects", label: "Projects", icon: FiFolder },
    { id: "memory", label: "Memory", icon: FiBookOpen },
    { id: "automations", label: "Automations", icon: FiClock },
    { id: "settings", label: "Settings", icon: FiSettings },
]
// Playful status words while a turn is running. They describe the mood, not specific steps,
// because the reply arrives in one piece and we can't see which tools the model is using.
const WORKING_WORDS = ["Thinking", "Pondering", "Noodling", "Mulling it over", "Connecting the dots", "Brewing", "Untangling", "Sketching ideas", "Puzzling", "Composing", "Wrangling words", "Polishing"]
const SUGGESTIONS = ["Summarize my portfolio projects", "Draft a tagline for my newest project", "Help me plan this week's priorities"]

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
const chip = (active: boolean) => `inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${focus} ${active ? "border-accent-1/60 bg-accent-1/12 text-white" : "border-white/10 text-muted hover:border-white/25 hover:text-white"}`
const smallButton = `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3.5 text-sm font-semibold text-fg transition-colors hover:border-accent-1 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`
const dangerButton = `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 ${focus}`
const rowIconButton = `inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-white/6 hover:text-white lg:size-8 ${focus}`
const compactSelect = `rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-fg transition-colors focus:border-accent-1 focus:outline-none disabled:opacity-50 [&>option]:bg-card`
const notice = "rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-sm leading-relaxed text-amber-50/90"
const blankProfile: Profile = { assistant_name: "Rogers", owner_name: "", response_style: "", ongoing_goals: "", custom_instructions: "", enabled_tools: ["site_read", "site_write", "chat_search", "web_research"], search_saved_chats: false }
const api = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const storageClient = api && anon ? createClient(api, anon, { auth: { persistSession: false, autoRefreshToken: false } }) : null

const shortDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export default function AssistantWorkspace () {
    const { notify } = useToast()
    const { confirm, prompt } = useDialog()
    const fail = React.useCallback((message: string) => notify(message, "error"), [notify])

    const [workspace, setWorkspace] = React.useState<Workspace | null>(null)
    const [tab, setTab] = React.useState<Tab>("chat")
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [projectId, setProjectId] = React.useState("")
    const [messages, setMessages] = React.useState<Message[]>([])
    const [draft, setDraft] = React.useState("")
    const [chatMode, setChatMode] = React.useState<ChatMode>("saved")
    const [busy, setBusy] = React.useState(false)
    const [startedAt, setStartedAt] = React.useState(0)
    const [historyOpen, setHistoryOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [searchResults, setSearchResults] = React.useState<{ query: string, conversations: Conversation[] } | null>(null)
    const [archived, setArchived] = React.useState(false)
    const [profile, setProfile] = React.useState<Profile>(blankProfile)
    const [projectForm, setProjectForm] = React.useState({ name: "", instructions: "" })
    const [memoryProvider, setMemoryProvider] = React.useState<Provider>("claude")
    const [importPreview, setImportPreview] = React.useState<Imported | null>(null)
    const [importing, setImporting] = React.useState(false)
    const [importProgress, setImportProgress] = React.useState("")
    const [inspectedMemory, setInspectedMemory] = React.useState<{ title: string, content: string } | null>(null)
    const [automationForm, setAutomationForm] = React.useState({ name: "Daily research report", instructions: "", cadence: "daily" as "daily" | "weekly" | "once", time: "09:00", runAt: "", weekday: "1", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" })
    const [runs, setRuns] = React.useState<Record<string, unknown>[]>([])
    const [uploadVersion, setUploadVersion] = React.useState(0)
    const abortRef = React.useRef<AbortController | null>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const composerRef = React.useRef<HTMLTextAreaElement>(null)

    const assistantName = profile.assistant_name || "Rogers"

    const applyWorkspace = React.useCallback((data: Workspace) => {
        setWorkspace(data)
        setProfile(data.profile ?? blankProfile)
        setProjectId(current => current || data.projects[0]?.id || "")
    }, [])
    const refresh = React.useCallback(async () => {
        const result = await adminFetch<Workspace>("/api/admin/agent/workspace")
        if (result.ok) applyWorkspace(result.data); else fail(result.error.message)
    }, [applyWorkspace, fail])
    React.useEffect(() => {
        let active = true
        void adminFetch<Workspace>("/api/admin/agent/workspace").then(result => {
            if (!active) return
            if (result.ok) applyWorkspace(result.data); else fail(result.error.message)
        })
        return () => { active = false }
    }, [applyWorkspace, fail])
    React.useEffect(() => {
        if (!search.trim()) return
        const timer = window.setTimeout(() => {
            const query = search
            void adminFetch<Conversation[]>(`/api/admin/agent/conversations?q=${encodeURIComponent(query)}`).then(result => { if (result.ok) setSearchResults({ query, conversations: result.data }) })
        }, 250)
        return () => window.clearTimeout(timer)
    }, [search])

    // Keep the newest message in view.
    React.useEffect(() => {
        const node = scrollRef.current
        if (node) node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" })
    }, [messages.length, busy])

    // Esc interrupts a running turn, like stopping a reply mid-thought.
    React.useEffect(() => {
        if (!busy) return
        function onKeyDown (event: KeyboardEvent) { if (event.key === "Escape") abortRef.current?.abort() }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [busy])

    const matches = search ? searchResults?.query === search ? searchResults.conversations : [] : workspace?.conversations ?? []
    const shownConversations = matches.filter(item => item.archived === archived)
    const activeTitle = chatMode === "saved" ? (workspace?.conversations.find(item => item.id === activeId)?.title ?? "New chat") : chatMode === "personalized_temporary" ? "Temporary chat" : "Temporary chat · unpersonalized"

    async function openConversation (id: string) {
        const result = await adminFetch<Conversation & { messages: Message[] }>(`/api/admin/agent/conversations/${id}`)
        if (!result.ok) { fail(result.error.message); return }
        setActiveId(id); setProjectId(result.data.project_id ?? ""); setMessages(result.data.messages); setChatMode("saved"); setTab("chat"); setHistoryOpen(false)
    }

    async function newSavedChat () {
        setTab("chat")
        const result = await adminFetch<Conversation>("/api/admin/agent/conversations", { json: { projectId: projectId || null } })
        if (!result.ok) { fail(result.error.message); return }
        setActiveId(result.data.id); setMessages([]); setChatMode("saved"); await refresh()
        composerRef.current?.focus()
    }

    function startTemporary (mode: "personalized_temporary" | "unpersonalized_temporary") {
        setActiveId(null); setMessages([]); setChatMode(mode)
    }

    async function sendMessage (event?: React.FormEvent) {
        event?.preventDefault()
        const text = draft.trim().slice(0, MESSAGE_MAX)
        if (!text || busy) return
        setBusy(true); setDraft(""); setStartedAt(Date.now())
        const began = performance.now()
        let conversationId = activeId
        if (chatMode === "saved" && !conversationId) {
            const created = await adminFetch<Conversation>("/api/admin/agent/conversations", { json: { projectId: projectId || null } })
            if (!created.ok) { setBusy(false); setDraft(text); fail(created.error.message); return }
            conversationId = created.data.id; setActiveId(conversationId)
        }
        const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text, fresh: true }
        const previous = messages.filter(message => message.role !== "note")
        setMessages(current => [...current, userMessage])
        const history: ChatMessage[] = [...previous.slice(-HISTORY_MAX).map(message => ({ role: message.role as "user" | "assistant", text: message.content.slice(0, MESSAGE_MAX) })), { role: "user", text }]
        const controller = new AbortController()
        abortRef.current = controller
        const request = await adminFetch<AgentReply>("/api/admin/agent", { json: { messages: history, conversationId: chatMode === "saved" ? conversationId : undefined, projectId: projectId || undefined, mode: chatMode }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]) })
        abortRef.current = null
        setBusy(false)
        if (controller.signal.aborted) {
            setMessages(current => [...current, { id: crypto.randomUUID(), role: "note", content: "Interrupted. Send another message whenever you're ready.", fresh: true }])
            return
        }
        if (!request.ok) {
            setMessages(current => [...current, { id: crypto.randomUUID(), role: "note", content: request.error.message, fresh: true }])
            return
        }
        const answer: Message = {
            id: crypto.randomUUID(), role: "assistant", content: request.data.reply, citations: request.data.citations, fresh: true,
            meta: { ms: performance.now() - began, model: request.data.usage.model },
            proposals: request.data.proposals.map((proposal: Proposal) => ({ proposal, status: "pending" as const })),
        }
        setMessages(current => [...current, answer])
        if (chatMode === "saved") await refresh()
    }

    async function saveTemporary () {
        const serializable = messages.filter(message => message.role === "user" || message.role === "assistant").map(message => ({ role: message.role, content: message.content, citations: message.citations ?? [] }))
        if (!serializable.length) return
        const result = await adminFetch<{ id: string }>("/api/admin/agent/conversations/save", { json: { projectId: projectId || null, title: serializable.find(message => message.role === "user")?.content.slice(0, 120) || "Temporary chat", messages: serializable } })
        if (!result.ok) { fail(result.error.message); return }
        setActiveId(result.data.id); setChatMode("saved"); notify("Temporary chat saved to history."); await openConversation(result.data.id); await refresh()
    }

    function setCardStatus (messageId: string, proposalId: string, patch: Partial<CardState>) {
        setMessages(current => current.map(message => message.id === messageId ? { ...message, proposals: message.proposals?.map(item => item.proposal.id === proposalId ? { ...item, ...patch } : item) } : message))
    }
    async function confirmProposal (messageId: string, card: CardState) {
        setCardStatus(messageId, card.proposal.id, { status: "confirming" })
        const result = await adminFetch<{ label: string }>("/api/admin/agent/confirm", { json: { proposal: card.proposal } })
        setCardStatus(messageId, card.proposal.id, { status: result.ok ? "done" : "pending", error: result.ok ? undefined : result.error.message })
        if (result.ok) notify(`${result.data.label} saved.`); else fail(result.error.message)
    }

    async function renameConversation (item: Conversation) {
        const title = await prompt({ title: "Rename chat", label: "Title", defaultValue: item.title, maxLength: 200, confirmLabel: "Rename" })
        if (!title?.trim() || title.trim() === item.title) return
        const result = await adminFetch(`/api/admin/agent/conversations/${item.id}`, { json: { action: "rename", title: title.trim() } })
        if (result.ok) await refresh(); else fail(result.error.message)
    }
    async function toggleArchive (item: Conversation) {
        const result = await adminFetch(`/api/admin/agent/conversations/${item.id}`, { json: { action: "archive", archived: !item.archived } })
        if (!result.ok) { fail(result.error.message); return }
        notify(item.archived ? "Chat restored." : "Chat archived.")
        if (item.id === activeId) { setActiveId(null); setMessages([]) }
        await refresh()
    }
    async function deleteConversation (item: Conversation) {
        if (!(await confirm({ title: "Delete this chat?", message: `“${item.title}” and its messages will be removed for good.`, confirmLabel: "Delete chat", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/agent/conversations/${item.id}`, { json: { action: "delete" } })
        if (!result.ok) { fail(result.error.message); return }
        notify("Chat deleted.")
        if (item.id === activeId) { setActiveId(null); setMessages([]) }
        await refresh()
    }

    async function saveProfile (event: React.FormEvent) {
        event.preventDefault()
        const result = await adminFetch<Profile>("/api/admin/agent/profile", { json: profile })
        if (!result.ok) fail(result.error.message); else { setProfile(result.data); notify("Assistant settings saved.") }
    }

    async function createProject (event: React.FormEvent) {
        event.preventDefault()
        const result = await adminFetch<Project>("/api/admin/agent/projects", { json: { ...projectForm, enabled_tools: ["site_read", "site_write", "chat_search", "project_files", "web_research"] } })
        if (!result.ok) fail(result.error.message)
        else { setProjectForm({ name: "", instructions: "" }); setProjectId(result.data.id); notify("Project created."); await refresh() }
    }

    async function saveProject (project: Project, changes: Partial<Project>) {
        const result = await adminFetch<Project>(`/api/admin/agent/projects/${project.id}`, { json: { action: "update", ...changes } })
        if (!result.ok) fail(result.error.message); else { notify("Project saved."); await refresh() }
    }

    async function deleteProject (project: Project) {
        if (!(await confirm({ title: `Delete ${project.name}?`, message: "Its private files and scheduled reports will be removed. Saved chats stay in your history.", confirmLabel: "Delete project", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/agent/projects/${project.id}`, { json: { action: "delete" } })
        if (!result.ok) { fail(result.error.message); return }
        if (projectId === project.id) setProjectId("")
        notify("Project deleted."); await refresh()
    }

    async function uploadProjectFile (project: Project, file: File) {
        if (!storageClient) { fail("Supabase client configuration is missing."); return }
        const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.name.toLowerCase().endsWith(".md") ? "text/markdown" : "text/plain")
        if (!["text/plain", "text/markdown", "application/pdf"].includes(type)) { fail("Upload a TXT, MD, or PDF file."); return }
        const signed = await adminFetch<{ path: string, token: string, contentType: string }>(`/api/admin/agent/projects/${project.id}/files/sign`, { json: { fileName: file.name, contentType: type, size: file.size } })
        if (!signed.ok) { fail(signed.error.message); return }
        const uploaded = await storageClient.storage.from("agent-project-files").uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: signed.data.contentType })
        if (uploaded.error) { fail("The private file upload failed."); return }
        const saved = await adminFetch(`/api/admin/agent/projects/${project.id}/files`, { json: { path: signed.data.path, fileName: file.name, contentType: type, size: file.size } })
        if (!saved.ok) fail(saved.error.message); else { notify("File uploaded and indexed."); setUploadVersion(version => version + 1) }
    }

    async function chooseMemoryFile (file: File | undefined) {
        setImportPreview(null); setImportProgress("")
        if (!file) return
        try {
            if (file.size > 50 * 1024 * 1024) throw new Error("Choose an export under 50 MB.")
            const parsed = await parseHistoryExport(file, memoryProvider)
            if (parsed.detected) setMemoryProvider(parsed.detected)
            setImportPreview({ sourceName: file.name, conversations: parsed.conversations, skipped: parsed.skipped, detected: parsed.detected })
        } catch (error) { fail(error instanceof Error ? error.message : "Could not read this export.") }
    }

    async function importMemory () {
        if (!importPreview || importing) return
        setImporting(true)
        let imported = 0
        const total = importPreview.conversations.length
        for (const [index, conversation] of importPreview.conversations.entries()) {
            const chunks = splitText(conversation.text, 12000)
            if (!chunks.length || chunks.length > 200) { setImportProgress(`Skipped an oversized conversation (${index + 1}/${total}).`); continue }
            setImportProgress(`Importing “${conversation.title.slice(0, 60)}” (${index + 1} of ${total})…`)
            const result = await adminFetch("/api/admin/agent/memories/import", { json: { provider: conversation.provider, sourceName: importPreview.sourceName, externalId: conversation.externalId, title: conversation.title, conversationDate: conversation.date, chunks } })
            if (!result.ok) { setImportProgress(`Stopped at conversation ${index + 1}: ${result.error.message}`); setImporting(false); fail(result.error.message); await refresh(); return }
            imported++
        }
        setImporting(false)
        setImportProgress(`Import complete: ${imported} conversation${imported === 1 ? "" : "s"} imported${importPreview.skipped ? `, ${importPreview.skipped} unsupported records skipped` : ""}.`)
        setImportPreview(null)
        notify(`${imported} conversation${imported === 1 ? "" : "s"} added to memory.`)
        await refresh()
    }

    async function inspectMemory (memory: Memory) {
        const result = await adminFetch<{ title: string, content: string }>(`/api/admin/agent/memories/conversation?id=${memory.id}`)
        if (result.ok) setInspectedMemory(result.data); else fail(result.error.message)
    }
    async function deleteMemory (memory: Memory) {
        if (!(await confirm({ title: "Remove from memory?", message: `“${memory.title}” will no longer be searchable by the assistant.`, confirmLabel: "Remove", tone: "danger" }))) return
        const result = await adminFetch("/api/admin/agent/memories/delete", { json: { sourceId: memory.id } })
        if (!result.ok) fail(result.error.message); else { notify("Imported conversation removed."); await refresh() }
    }

    async function createAutomation (event: React.FormEvent) {
        event.preventDefault()
        if (!projectId) { fail("Create or select a project first."); return }
        const [hour, minute] = automationForm.time.split(":").map(Number)
        const result = await adminFetch("/api/admin/agent/automations", { json: { name: automationForm.name, instructions: automationForm.instructions, projectId, cadence: automationForm.cadence, hour, minute, weekday: Number(automationForm.weekday), runAt: automationForm.runAt, timezone: automationForm.timezone } })
        if (!result.ok) fail(result.error.message); else { notify("Research report scheduled."); await refresh() }
    }
    async function automationAction (automation: Automation, action: "pause" | "enable" | "delete" | "run_now") {
        if (action === "delete" && !(await confirm({ title: `Delete ${automation.name}?`, message: "The schedule and its run history will be removed.", confirmLabel: "Delete", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/agent/automations/${automation.id}`, { json: { action } })
        if (!result.ok) fail(result.error.message)
        else { notify(action === "run_now" ? "Research run completed. The report was saved to its project." : `Automation ${action === "delete" ? "deleted" : action === "pause" ? "paused" : "enabled"}.`); await refresh() }
    }
    async function loadRuns (automation: Automation) {
        const result = await adminFetch<Record<string, unknown>[]>(`/api/admin/agent/automations/${automation.id}/runs`)
        if (result.ok) setRuns(result.data); else fail(result.error.message)
    }

    function onTabKeyDown (event: React.KeyboardEvent, index: number) {
        const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }
        if (!(event.key in targets)) return
        event.preventDefault()
        const next = TABS[(targets[event.key] + TABS.length) % TABS.length]
        setTab(next.id)
        document.getElementById(`assistant-tab-${next.id}`)?.focus()
    }
    const counts: Partial<Record<Tab, number>> = { projects: workspace?.projects.length, memory: workspace?.memories.length, automations: workspace?.automations.length }

    const historyPanel = (
        <section className="flex flex-col rounded-2xl border border-white/6 bg-card p-4 motion-safe:animate-rise-in" aria-label="Chat history">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">History</h2>
                <div className="flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Show chats">
                    {([false, true] as const).map(value => <button key={String(value)} type="button" aria-pressed={archived === value} onClick={() => setArchived(value)} className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold transition-colors ${focus} ${archived === value ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}>{value ? "Archived" : "Active"}</button>)}
                </div>
            </div>
            <div className="relative mt-3">
                <FiSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim" aria-hidden="true" />
                <input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search chats and messages" placeholder="Search chats" className={`${inputClass} pl-9`} />
            </div>
            <ul className="mt-3 -mx-1 flex max-h-[calc(100dvh-20rem)] min-h-24 flex-col gap-0.5 overflow-y-auto px-1">
                {shownConversations.map(item => (
                    <li key={item.id} className={`group flex items-center gap-1 rounded-lg transition-colors ${activeId === item.id ? "bg-white/6" : "hover:bg-white/4"}`}>
                        <button type="button" onClick={() => void openConversation(item.id)} aria-current={activeId === item.id ? "true" : undefined} className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left ${focus}`}>
                            <span className={`block truncate text-sm ${activeId === item.id ? "text-white" : "text-muted group-hover:text-white"}`}>{item.title}</span>
                            <span className="mt-0.5 block text-xs text-dim">{shortDate(item.updated_at ?? item.created_at)}</span>
                        </button>
                        <span className="flex shrink-0 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                            <button type="button" onClick={() => void renameConversation(item)} className={rowIconButton} aria-label={`Rename ${item.title}`} title="Rename"><FiEdit2 aria-hidden="true" /></button>
                            <button type="button" onClick={() => void toggleArchive(item)} className={rowIconButton} aria-label={`${item.archived ? "Restore" : "Archive"} ${item.title}`} title={item.archived ? "Restore" : "Archive"}>{item.archived ? <FiRotateCcw aria-hidden="true" /> : <FiArchive aria-hidden="true" />}</button>
                            <button type="button" onClick={() => void deleteConversation(item)} className={`${rowIconButton} hover:text-rose-300`} aria-label={`Delete ${item.title}`} title="Delete"><FiTrash2 aria-hidden="true" /></button>
                        </span>
                    </li>
                ))}
                {shownConversations.length === 0 && <li className="px-2.5 py-3 text-sm text-dim">{search ? "No chats match that search." : archived ? "No archived chats." : "No chats yet. Say hello below."}</li>}
            </ul>
            <p className="mt-4 border-t border-white/6 pt-3 text-xs leading-relaxed text-dim">Temporary chats stay out of history and are read-only. Personalized ones can still use your memory and project context.</p>
        </section>
    )

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Agent workspace</h1>
                    <p className="mt-1 text-sm text-muted">Chat with {assistantName}, manage projects and memory, and schedule research. Site changes always wait for your confirmation.</p>
                </div>
                <button type="button" onClick={() => void newSavedChat()} className={primaryButtonClass}><FiPlus aria-hidden="true" /> New chat</button>
            </div>

            <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Workspace sections">
                {TABS.map(({ id, label, icon: Icon }, index) => (
                    <button key={id} id={`assistant-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`assistant-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => onTabKeyDown(event, index)} className={chip(tab === id)}>
                        <Icon className="text-[15px]" aria-hidden="true" />{label}
                        {counts[id] ? <span className="text-xs font-medium text-dim">{counts[id]}</span> : null}
                    </button>
                ))}
            </div>

            <div id={`assistant-panel-${tab}`} role="tabpanel" aria-labelledby={`assistant-tab-${tab}`} key={tab} className="motion-safe:animate-fade-in">
                {tab === "chat" && (
                    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
                        <div className="hidden lg:sticky lg:top-10 lg:block lg:self-start">{historyPanel}</div>
                        {historyOpen && <div className="lg:hidden">{historyPanel}</div>}

                        <section className="flex min-h-[70dvh] flex-col rounded-2xl border border-white/6 bg-card lg:h-[calc(100dvh-14rem)] lg:min-h-[32rem]" aria-label="Conversation">
                            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-4 py-3 md:px-6">
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-bold text-fg">{activeTitle}</h2>
                                    <p className="mt-0.5 text-xs text-dim">{chatMode === "saved" ? "Saved to history" : "Not saved to history · read-only"}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => setHistoryOpen(open => !open)} aria-expanded={historyOpen} className={`${smallButton} lg:hidden`}><FiClock aria-hidden="true" /> History</button>
                                    <select aria-label="Project context" value={projectId} disabled={chatMode === "unpersonalized_temporary"} className={`${compactSelect} max-w-44`} onChange={event => {
                                        const next = event.target.value
                                        setProjectId(next)
                                        if (activeId && chatMode === "saved") void adminFetch(`/api/admin/agent/conversations/${activeId}`, { json: { action: "assign_project", projectId: next || null } }).then(result => { if (!result.ok) fail(result.error.message) })
                                    }}>
                                        <option value="">No project</option>
                                        {(workspace?.projects ?? []).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                    </select>
                                    <select aria-label="Chat type" value={chatMode} className={compactSelect} onChange={event => {
                                        const next = event.target.value as ChatMode
                                        if (next === "saved") { setChatMode("saved"); setActiveId(null); setMessages([]) } else startTemporary(next)
                                    }}>
                                        <option value="saved">Saved chat</option>
                                        <option value="personalized_temporary">Temporary · personalized</option>
                                        <option value="unpersonalized_temporary">Temporary · unpersonalized</option>
                                    </select>
                                    {chatMode !== "saved" && messages.some(message => message.role !== "note") && <button type="button" onClick={() => void saveTemporary()} className={smallButton}>Save chat</button>}
                                </div>
                            </header>

                            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6" aria-live="polite">
                                {messages.length === 0 && !busy && (
                                    <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center motion-safe:animate-rise-in">
                                        <span className="grid size-12 place-items-center rounded-2xl bg-accent-1/10 text-accent-1"><Spark className="size-6 motion-safe:animate-spark" /></span>
                                        <h3 className="mt-4 text-lg font-bold text-fg">What can I help you with?</h3>
                                        <p className="mt-2 text-sm text-muted">Ask about your portfolio, draft content, brainstorm, or have me prepare site changes for you to confirm.</p>
                                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                                            {SUGGESTIONS.map(example => <button key={example} type="button" onClick={() => { setDraft(example); composerRef.current?.focus() }} className={chip(false)}>{example}</button>)}
                                        </div>
                                    </div>
                                )}
                                {messages.map(message => (
                                    <ChatBubble key={message.id} message={message} assistantName={chatMode === "unpersonalized_temporary" ? "Assistant" : assistantName}>
                                        {message.proposals?.map(card => (
                                            <div key={card.proposal.id} className="mt-3 motion-safe:animate-rise-in">
                                                <ProposalCard card={card} onDiscard={() => setCardStatus(message.id, card.proposal.id, { status: "discarded" })} onConfirm={() => void confirmProposal(message.id, card)} />
                                            </div>
                                        ))}
                                    </ChatBubble>
                                ))}
                                {busy && <WorkingIndicator name={assistantName} startedAt={startedAt} onStop={() => abortRef.current?.abort()} />}
                            </div>

                            <form onSubmit={sendMessage} className="border-t border-white/6 p-3 md:p-4">
                                <label className="sr-only" htmlFor="assistant-composer">Message {assistantName}</label>
                                <div className="relative">
                                    <textarea ref={composerRef} id="assistant-composer" value={draft} onChange={event => setDraft(event.target.value)} maxLength={MESSAGE_MAX} rows={1} placeholder={`Message ${assistantName}…`} className={`${inputClass} field-sizing-content max-h-40 min-h-12 resize-none pr-14 leading-relaxed`} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage() } }} />
                                    {busy
                                        ? <button type="button" onClick={() => abortRef.current?.abort()} className={`absolute right-2 bottom-2 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/6 text-fg transition-colors hover:border-rose-400 hover:text-rose-300 ${focus}`} aria-label="Stop the reply"><FiSquare className="size-3.5 fill-current" aria-hidden="true" /></button>
                                        : <button type="submit" disabled={!draft.trim()} className={`absolute right-2 bottom-2 inline-flex size-9 items-center justify-center rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] transition-all hover:shadow-[0_6px_30px_rgba(222,14,255,0.4)] disabled:opacity-40 disabled:shadow-none ${focus}`} aria-label="Send message"><FiArrowUp aria-hidden="true" /></button>}
                                </div>
                                <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-dim">
                                    <span>{busy ? "Esc to interrupt" : "Enter to send · Shift+Enter for a new line"}</span>
                                    <span>{draft.length}/{MESSAGE_MAX}</span>
                                </p>
                                {chatMode !== "saved" && <p className="mt-1 text-xs text-dim">Temporary chats aren&apos;t saved by this app. Usage still counts toward the daily AI limit, and Gemini&apos;s terms apply.</p>}
                            </form>
                        </section>
                    </div>
                )}

                {tab === "projects" && (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                        <form onSubmit={createProject} className="lg:sticky lg:top-10 lg:self-start">
                            <Card title="New project" hint="Instructions, files and tools for focused chats.">
                                <TextField label="Name" required value={projectForm.name} maxLength={120} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} placeholder="e.g. Job search" />
                                <TextAreaField label="Instructions" rows={4} value={projectForm.instructions} maxLength={5000} onChange={event => setProjectForm({ ...projectForm, instructions: event.target.value })} placeholder="Context and instructions the assistant should follow in this project" />
                                <button type="submit" className={`${primaryButtonClass} self-start`}><FiPlus aria-hidden="true" /> Create project</button>
                            </Card>
                        </form>
                        <div className="flex min-w-0 flex-col gap-5">
                            {(workspace?.projects ?? []).map(project => (
                                <ProjectPanel key={`${project.id}-${uploadVersion}`} project={project} isSelected={project.id === projectId} onSelect={() => setProjectId(project.id)} onSave={changes => saveProject(project, changes)} onUpload={file => void uploadProjectFile(project, file)} onError={fail} onDelete={() => void deleteProject(project)} />
                            ))}
                            {!workspace?.projects.length && <EmptyState icon={FiFolder} title="No projects yet" text="Create one to group instructions, reference files and chats." />}
                        </div>
                    </div>
                )}

                {tab === "memory" && (
                    <div className="flex flex-col gap-5">
                        <Card title="Import chat history" hint="Make past ChatGPT or Claude chats searchable for the assistant. This is retrieval at question time; it doesn't train the model.">
                            <p className={notice}>Import stores supported user and assistant text in this Supabase project. Matching excerpts may be sent to Gemini when memory search is enabled. Raw archives and attachments stay in your browser and are not uploaded. You can inspect and delete each source below.</p>
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                                <SelectField label="Export from" hint="Detected from the file when possible." value={memoryProvider} onChange={event => { setMemoryProvider(event.target.value as Provider); setImportPreview(null) }}>
                                    <option value="claude">Claude</option>
                                    <option value="chatgpt">ChatGPT</option>
                                </SelectField>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="memory-export" className="text-sm font-medium text-fg/90">Export file</label>
                                    <input id="memory-export" type="file" accept=".json,.zip,application/json,application/zip" disabled={importing} onChange={event => void chooseMemoryFile(event.target.files?.[0])} className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-fg`} />
                                    <p className="text-xs text-dim">The ZIP or conversations.json from Settings → Export data.</p>
                                </div>
                            </div>
                            {importPreview && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-1/25 bg-accent-1/6 p-4 motion-safe:animate-rise-in">
                                    <p className="text-sm text-muted">
                                        Found <strong className="text-fg">{importPreview.conversations.length}</strong> conversation{importPreview.conversations.length === 1 ? "" : "s"}{importPreview.detected ? <> from <strong className="text-fg">{importPreview.detected === "claude" ? "Claude" : "ChatGPT"}</strong></> : null}.
                                        {importPreview.skipped ? ` ${importPreview.skipped} unsupported records will be skipped.` : ""} Nothing is saved until you import.
                                    </p>
                                    <button type="button" onClick={() => void importMemory()} disabled={importing} className={primaryButtonClass}><FiUpload aria-hidden="true" /> {importing ? "Importing…" : "Import conversations"}</button>
                                </div>
                            )}
                            {importProgress && <p role="status" className="flex items-center gap-2 text-sm text-muted">{importing && <Spark className="size-4 text-accent-1 motion-safe:animate-spark" />}{importProgress}</p>}
                        </Card>

                        <Card title={`Imported sources (${workspace?.memories.length ?? 0})`} hint="Each imported conversation. Inspect the full text or remove it from memory.">
                            {(workspace?.memories ?? []).length > 0
                                ? <ul className="-my-1 flex max-h-[32rem] flex-col gap-2 overflow-y-auto py-1">
                                    {(workspace?.memories ?? []).map(memory => (
                                        <li key={memory.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-fg">{memory.title}</p>
                                                <p className="mt-0.5 text-xs text-dim">{memory.provider === "claude" ? "Claude" : "ChatGPT"} · {memory.source_name} · {memory.conversation_date ? new Date(memory.conversation_date).toLocaleDateString() : "date unknown"}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button type="button" onClick={() => void inspectMemory(memory)} className={smallButton}>Inspect</button>
                                                <button type="button" onClick={() => void deleteMemory(memory)} className={dangerButton}>Remove</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                : <p className="text-sm text-dim">Nothing imported yet.</p>}
                        </Card>
                    </div>
                )}

                {tab === "automations" && (
                    <div className="flex flex-col gap-5">
                        {workspace && !workspace.automationReady && <p className={notice}>Background schedules need <code>CRON_SECRET</code> and <code>SUPABASE_SECRET_KEY</code> configured in the deployment. Add both, deploy, then create or enable schedules.</p>}
                        <form onSubmit={createAutomation}>
                            <Card title="New research report" hint="Runs in the background and saves a report as a chat in a project. It can research and summarize; it can't change site data or act in other accounts.">
                                <TextField label="Report name" required value={automationForm.name} maxLength={120} onChange={event => setAutomationForm({ ...automationForm, name: event.target.value })} />
                                <TextAreaField label="What should it research?" required rows={3} value={automationForm.instructions} maxLength={5000} onChange={event => setAutomationForm({ ...automationForm, instructions: event.target.value })} />
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <SelectField label="Save in project" value={projectId} onChange={event => setProjectId(event.target.value)}>
                                        <option value="">Choose a project…</option>
                                        {workspace?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                    </SelectField>
                                    <SelectField label="Cadence" value={automationForm.cadence} onChange={event => setAutomationForm({ ...automationForm, cadence: event.target.value as "daily" | "weekly" | "once" })}>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="once">One time</option>
                                    </SelectField>
                                    {automationForm.cadence === "once"
                                        ? <TextField label="Run at" type="datetime-local" value={automationForm.runAt} onChange={event => setAutomationForm({ ...automationForm, runAt: event.target.value })} />
                                        : <TextField label="Time" type="time" value={automationForm.time} onChange={event => setAutomationForm({ ...automationForm, time: event.target.value })} />}
                                    <TextField label="Timezone" value={automationForm.timezone} maxLength={80} onChange={event => setAutomationForm({ ...automationForm, timezone: event.target.value })} placeholder="e.g. Africa/Monrovia" />
                                </div>
                                {automationForm.cadence === "weekly" && (
                                    <SelectField label="Day" className="sm:max-w-xs" value={automationForm.weekday} onChange={event => setAutomationForm({ ...automationForm, weekday: event.target.value })}>
                                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                                    </SelectField>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <button type="submit" disabled={!workspace?.automationReady} className={primaryButtonClass}>Schedule report</button>
                                    <p className="text-xs text-dim">Due reports are checked every 15 minutes; Vercel&apos;s schedule window can shift delivery a little.</p>
                                </div>
                            </Card>
                        </form>
                        {workspace?.automations.map(automation => (
                            <Card key={automation.id} title={automation.name} hint={`${automation.cadence} · ${automation.schedule_expression} · ${automation.timezone}`} action={<AutomationBadge automation={automation} />}>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{automation.instructions}</p>
                                <p className="text-xs text-dim">{automation.enabled ? `Next run ${automation.next_run_at ? new Date(automation.next_run_at).toLocaleString() : "queued"}` : "Paused"}{automation.last_run_at ? ` · Last run ${new Date(automation.last_run_at).toLocaleString()}` : ""}</p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" disabled={!automation.enabled} title={automation.enabled ? "Run report now" : "Enable this schedule before running it"} onClick={() => void automationAction(automation, "run_now")} className={smallButton}>Run now</button>
                                    <button type="button" onClick={() => void automationAction(automation, automation.enabled ? "pause" : "enable")} className={smallButton}>{automation.enabled ? "Pause" : "Enable"}</button>
                                    <button type="button" onClick={() => void loadRuns(automation)} className={smallButton}>Run history</button>
                                    <button type="button" onClick={() => void automationAction(automation, "delete")} className={dangerButton}>Delete</button>
                                </div>
                            </Card>
                        ))}
                        {runs.length > 0 && (
                            <Card title="Recent runs">
                                <div className="-my-2 divide-y divide-white/6">
                                    {runs.map(run => (
                                        <details key={String(run.id)} className="py-2">
                                            <summary className="cursor-pointer text-sm text-muted hover:text-white">{String(run.status)} · {String(run.report_title ?? run.error_summary ?? run.created_at)}</summary>
                                            {typeof run.report_content === "string" && <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{run.report_content}</pre>}
                                        </details>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {tab === "settings" && (
                    <form onSubmit={saveProfile} className="flex max-w-3xl flex-col gap-5">
                        <Card title="Profile" hint="Personalizes every request. These are instructions, not model training.">
                            <TextField label="Assistant name" value={profile.assistant_name} maxLength={60} onChange={event => setProfile({ ...profile, assistant_name: event.target.value })} />
                            <TextField label="What should it call you?" value={profile.owner_name} maxLength={100} onChange={event => setProfile({ ...profile, owner_name: event.target.value })} />
                            <TextAreaField label="Response style" rows={3} value={profile.response_style} maxLength={2000} onChange={event => setProfile({ ...profile, response_style: event.target.value })} placeholder="Tone, length, formatting preferences" />
                            <TextAreaField label="Ongoing goals and context" rows={4} value={profile.ongoing_goals} maxLength={5000} onChange={event => setProfile({ ...profile, ongoing_goals: event.target.value })} />
                            <TextAreaField label="Custom instructions and boundaries" rows={4} value={profile.custom_instructions} maxLength={5000} onChange={event => setProfile({ ...profile, custom_instructions: event.target.value })} />
                        </Card>
                        <Card title="Tools" hint="What the assistant may use. Projects can narrow this further.">
                            <div className="-my-3 divide-y divide-white/6">
                                {TOOLS.map(tool => <ToolRow key={tool.id} label={tool.label} detail={tool.detail} checked={profile.enabled_tools.includes(tool.id)} onChange={checked => setProfile({ ...profile, enabled_tools: checked ? [...new Set([...profile.enabled_tools, tool.id])] : profile.enabled_tools.filter(item => item !== tool.id) })} />)}
                                <ToolRow label="Search all saved chats" detail="When chat memory is on, search every saved chat instead of only the selected project." checked={profile.search_saved_chats} onChange={checked => setProfile({ ...profile, search_saved_chats: checked })} />
                            </div>
                        </Card>
                        <p className="text-xs leading-relaxed text-dim">Imported excerpts and project files are sent to Gemini only when retrieved for a request. Web search uses Google grounding and has its own quota. All requests count toward the shared daily AI limit.</p>
                        <div className="flex justify-end"><button type="submit" className={primaryButtonClass}>Save settings</button></div>
                    </form>
                )}
            </div>

            {inspectedMemory && <TranscriptDialog title={inspectedMemory.title} content={inspectedMemory.content} onClose={() => setInspectedMemory(null)} />}
        </>
    )
}

// A small eight-point asterisk used for the assistant's "working" state.
function Spark ({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            {[0, 45, 90, 135].map(angle => <rect key={angle} x="10.75" y="2" width="2.5" height="20" rx="1.25" transform={`rotate(${angle} 12 12)`} />)}
        </svg>
    )
}

function WorkingIndicator ({ name, startedAt, onStop }: { name: string, startedAt: number, onStop: () => void }) {
    const [now, setNow] = React.useState(startedAt)
    const [wordIndex, setWordIndex] = React.useState(() => Math.floor(Math.random() * WORKING_WORDS.length))
    React.useEffect(() => {
        const clock = window.setInterval(() => setNow(Date.now()), 1000)
        const words = window.setInterval(() => setWordIndex(index => (index + 1 + Math.floor(Math.random() * 3)) % WORKING_WORDS.length), 2600)
        return () => { window.clearInterval(clock); window.clearInterval(words) }
    }, [])
    const seconds = Math.max(0, Math.round((now - startedAt) / 1000))
    return (
        <div className="flex items-center gap-3 motion-safe:animate-rise-in" role="status">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-1/10 text-accent-1"><Spark className="size-4 motion-safe:animate-spark" /></span>
            <p className="min-w-0 text-sm">
                <span key={wordIndex} className="inline-block bg-[linear-gradient(90deg,var(--color-muted)_0%,var(--color-fg)_50%,var(--color-muted)_100%)] bg-size-[200%_100%] bg-clip-text font-medium text-transparent motion-safe:animate-shimmer">{WORKING_WORDS[wordIndex]}…</span>
                <span className="ml-2 text-xs text-dim">{seconds}s · {name} is on it</span>
            </p>
            <button type="button" onClick={onStop} className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-dim transition-colors hover:bg-white/6 hover:text-white ${focus}`}>Stop</button>
        </div>
    )
}

// Reveals a fresh reply progressively so it reads like it's being written.
function TypedText ({ text, animate }: { text: string, animate: boolean }) {
    const [shown, setShown] = React.useState(() => animate && !prefersReducedMotion() ? 0 : text.length)
    React.useEffect(() => {
        if (shown >= text.length) return
        const total = Math.min(1600, 300 + text.length * 6)
        const start = performance.now()
        let frame = 0
        const step = (time: number) => {
            const next = Math.ceil(text.length * Math.min(1, (time - start) / total))
            setShown(next)
            if (next < text.length) frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
        // Runs once per message; `shown` only gates the first run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text])
    const done = shown >= text.length
    return <p className="whitespace-pre-wrap wrap-break-word">{text.slice(0, shown)}{!done && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-accent-1/80 motion-safe:animate-pulse" aria-hidden="true" />}</p>
}

function ChatBubble ({ message, assistantName, children }: { message: Message, assistantName: string, children?: React.ReactNode }) {
    const rise = message.fresh ? "motion-safe:animate-rise-in" : ""
    if (message.role === "note") {
        return <p className={`mx-auto w-fit max-w-full rounded-full border border-white/8 bg-white/3 px-3.5 py-1.5 text-center text-xs text-muted ${rise}`}>{message.content}</p>
    }
    if (message.role === "user") {
        return (
            <article className={`ml-auto max-w-[85%] ${rise}`}>
                <div className="rounded-2xl rounded-br-md bg-white/6 px-4 py-3 text-sm leading-relaxed text-fg">
                    <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
                </div>
            </article>
        )
    }
    return (
        <article className={`mr-auto flex max-w-[92%] gap-3 ${rise}`}>
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-1/10 text-accent-1" aria-hidden="true"><Spark className="size-4" /></span>
            <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold tracking-wider text-dim uppercase">{assistantName}</p>
                <div className="rounded-2xl rounded-tl-md border border-white/6 bg-white/2 px-4 py-3 text-sm leading-relaxed text-fg">
                    <TypedText text={message.content} animate={Boolean(message.fresh)} />
                    {message.citations?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/6 pt-3">
                            {message.citations.map(citation => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer" className={`max-w-full truncate rounded-full border border-white/10 px-2.5 py-1 text-xs text-accent-1 hover:border-accent-1/50 ${focus}`}>{citation.title}</a>)}
                        </div>
                    ) : null}
                </div>
                {children}
                {message.meta && <p className="mt-1.5 text-xs text-dim">Answered in {(message.meta.ms / 1000).toFixed(1)}s · {message.meta.model}</p>}
            </div>
        </article>
    )
}

function ToolRow ({ label, detail, checked, onChange }: { label: string, detail: string, checked: boolean, onChange: (checked: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{label}</p>
                <p className="mt-0.5 text-xs text-dim">{detail}</p>
            </div>
            <Switch checked={checked} onChange={onChange} label={label} />
        </div>
    )
}

function EmptyState ({ icon: Icon, title, text }: { icon: IconType, title: string, text: string }) {
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 p-8 text-center motion-safe:animate-rise-in">
            <Icon className="text-2xl text-dim" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-fg">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
        </div>
    )
}

function AutomationBadge ({ automation }: { automation: Automation }) {
    const [label, style] = automation.failure_count
        ? [`${automation.failure_count} failed run${automation.failure_count === 1 ? "" : "s"}`, "bg-rose-400/10 text-rose-300"]
        : automation.enabled ? ["Active", "bg-emerald-400/10 text-emerald-300"] : ["Paused", "bg-white/6 text-muted"]
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{label}</span>
}

function TranscriptDialog ({ title, content, onClose }: { title: string, content: string, onClose: () => void }) {
    const closeRef = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => {
        closeRef.current?.focus()
        function onKeyDown (event: KeyboardEvent) { if (event.key === "Escape") onClose() }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])
    return (
        <div className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-3 motion-safe:animate-fade-in" role="dialog" aria-modal="true" aria-label={title}>
            <section className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-card shadow-2xl motion-safe:animate-rise-in">
                <header className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
                    <h2 className="min-w-0 truncate text-lg font-bold text-fg">{title}</h2>
                    <button ref={closeRef} type="button" onClick={onClose} className={rowIconButton} aria-label="Close transcript"><FiX aria-hidden="true" /></button>
                </header>
                <pre className="overflow-auto px-5 py-4 font-sans text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-fg">{content}</pre>
            </section>
        </div>
    )
}

function ProjectPanel ({ project, isSelected, onSelect, onSave, onUpload, onError, onDelete }: { project: Project, isSelected: boolean, onSelect: () => void, onSave: (changes: Partial<Project>) => void, onUpload: (file: File) => void, onError: (value: string) => void, onDelete: () => void }) {
    const [name, setName] = React.useState(project.name)
    const [instructions, setInstructions] = React.useState(project.instructions)
    const [files, setFiles] = React.useState<{ id: string, file_name: string, size_bytes: number }[]>([])
    React.useEffect(() => { void adminFetch<typeof files>(`/api/admin/agent/projects/${project.id}/files`).then(result => { if (result.ok) setFiles(result.data) }) }, [project.id])
    async function removeFile (fileId: string) {
        const result = await adminFetch(`/api/admin/agent/projects/${project.id}/files/${fileId}`, { json: {} })
        if (!result.ok) onError(result.error.message); else setFiles(current => current.filter(item => item.id !== fileId))
    }
    return (
        <div className="motion-safe:animate-rise-in">
            <Card title={project.name} action={<button type="button" onClick={onSelect} aria-pressed={isSelected} className={chip(isSelected)}>{isSelected ? "Selected for chat" : "Use in chat"}</button>}>
                <TextField label="Name" value={name} maxLength={120} onChange={event => setName(event.target.value)} />
                <TextAreaField label="Instructions" rows={3} value={instructions} maxLength={5000} onChange={event => setInstructions(event.target.value)} />
                <div>
                    <p className="text-sm font-medium text-fg/90">Tools</p>
                    <div className="mt-1 divide-y divide-white/6">
                        {TOOLS.map(tool => <ToolRow key={tool.id} label={tool.label} detail={tool.detail} checked={project.enabled_tools.includes(tool.id)} onChange={checked => onSave({ enabled_tools: checked ? [...new Set([...project.enabled_tools, tool.id])] : project.enabled_tools.filter(item => item !== tool.id) })} />)}
                    </div>
                </div>
                {files.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {files.map(file => (
                            <li key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/2 px-3 py-2 text-sm">
                                <span className="flex min-w-0 items-center gap-2 text-muted"><FiFileText className="shrink-0 text-dim" aria-hidden="true" /><span className="truncate">{file.file_name}</span><span className="shrink-0 text-xs text-dim">{Math.ceil(file.size_bytes / 1024)} KB</span></span>
                                <button type="button" onClick={() => void removeFile(file.id)} className={`${rowIconButton} hover:text-rose-300`} aria-label={`Remove ${file.file_name}`}><FiTrash2 aria-hidden="true" /></button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onSave({ name, instructions })} className={primaryButtonClass}>Save project</button>
                    <label className={`${smallButton} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-1`}>
                        <FiUpload aria-hidden="true" /> Add TXT / MD / PDF
                        <input type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = "" }} />
                    </label>
                    <button type="button" onClick={onDelete} className={`${dangerButton} ml-auto`}>Delete project</button>
                </div>
            </Card>
        </div>
    )
}

function splitText (text: string, size: number) { const chunks: string[] = []; for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size)); return chunks }

async function parseHistoryExport (file: File, fallback: Provider) {
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
        const result = normalizeConversations(value, fallback)
        supportedShape ||= result.supported
        conversations = conversations.concat(result.conversations)
        skipped += result.skipped
    }
    const unique = [...new Map(conversations.map(item => [item.externalId, item])).values()]
    if (!supportedShape || unique.length === 0) throw new Error("No user/assistant conversations were found. Choose the ZIP or conversations.json from your ChatGPT or Claude data export.")
    const claude = unique.filter(item => item.provider === "claude").length
    const detected: Provider | null = claude === unique.length ? "claude" : claude === 0 ? "chatgpt" : null
    return { conversations: unique, skipped, detected }
}

// Reads ChatGPT (`mapping`) and Claude (`chat_messages`) exports by their shape, whichever
// provider is selected, so picking the wrong one no longer skips every conversation.
function normalizeConversations (raw: unknown, fallback: Provider) {
    const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
    const list = Array.isArray(raw) ? raw : Array.isArray(root.conversations) ? root.conversations : root.mapping || root.chat_messages ? [raw] : []
    if (!list.length) return { conversations: [] as Normalized[], skipped: 1, supported: false }
    const conversations: Normalized[] = []
    let skipped = 0
    for (const [index, item] of list.entries()) {
        if (!item || typeof item !== "object") { skipped++; continue }
        const row = item as Record<string, unknown>
        const title = stringValue(row.name ?? row.title) || `Conversation ${index + 1}`
        const externalId = stringValue(row.id ?? row.uuid ?? row.conversation_id) || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}-${index}`
        let messages: { role: "user" | "assistant", text: string, time?: number }[] = []
        let provider: Provider = fallback
        if (row.mapping && typeof row.mapping === "object") {
            provider = "chatgpt"
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
        } else if (Array.isArray(row.chat_messages)) {
            provider = "claude"
            messages = row.chat_messages.flatMap(message => {
                if (!message || typeof message !== "object") return []
                const msg = message as Record<string, unknown>
                const sender = stringValue(msg.sender ?? msg.role).toLowerCase()
                const role = sender === "human" || sender === "user" ? "user" : sender === "assistant" ? "assistant" : null
                const text = extractText(msg.text) || extractText(msg.content)
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
        conversations.push({ externalId, title: title.slice(0, 500), date: firstTime && Number.isFinite(firstTime) ? new Date(firstTime * 1000).toISOString() : null, text, provider })
    }
    return { conversations, skipped, supported: conversations.length > 0 || list.some(item => item && typeof item === "object" && ("mapping" in item || "chat_messages" in item || "messages" in item)) }
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
