"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiLock, FiUnlock } from "react-icons/fi"
import BlogEditor from "@/components/admin/BlogEditor"
import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, SelectField, TextAreaField, TextField, iconButtonClass, inputClass } from "@/components/admin/Field"
import { useScrollToFirstError, useUnsavedGuard, zodErrorsToRecord } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import type { AdminPost } from "@/lib/admin/blog-queries"
import { blogPostInputSchema } from "@/lib/admin/blog-schemas"
import { EMPTY_DOC, readingMinutes, toPlainText, type BlogDoc } from "@/lib/blog/content"
import { slugify } from "@/lib/projects/shared"

type FormState = {
    title: string
    slug: string
    slugLocked: boolean
    excerpt: string
    content: BlogDoc
    cover_path: string | null
    cover_url: string | null
    seo_description: string
    canonical_url: string
    status: "draft" | "published"
    publishDate: string // YYYY-MM-DD (UTC)
    originalPublishedAt: string | null
}

// Dates are edited as UTC calendar days, so server and browser render the same value.
const utcDate = (iso: string) => new Date(iso).toISOString().slice(0, 10)

function toFormState (post?: AdminPost): FormState {
    return {
        title: post?.title ?? "",
        slug: post?.slug ?? "",
        slugLocked: Boolean(post),
        excerpt: post?.excerpt ?? "",
        content: post?.content ?? EMPTY_DOC,
        cover_path: post?.cover_path ?? null,
        cover_url: post?.coverUrl ?? null,
        seo_description: post?.seo_description ?? "",
        canonical_url: post?.canonical_url ?? "",
        status: post?.status ?? "draft",
        publishDate: post ? utcDate(post.published_at) : "",
        originalPublishedAt: post?.published_at ?? null,
    }
}

function toPayload (state: FormState) {
    // Keep the original time of day when the date is unchanged; new dates publish at 00:00 UTC.
    const keepOriginal = state.originalPublishedAt && utcDate(state.originalPublishedAt) === state.publishDate
    const published_at = keepOriginal
        ? new Date(state.originalPublishedAt!).toISOString()
        : state.publishDate ? `${state.publishDate}T00:00:00.000Z` : new Date().toISOString()

    return {
        title: state.title,
        slug: state.slug,
        excerpt: state.excerpt,
        content: state.content,
        cover_path: state.cover_path,
        seo_description: state.seo_description,
        canonical_url: state.canonical_url,
        status: state.status,
        published_at,
    }
}

// For dirty tracking: the "now" fallback for an empty date must not count as a change.
const snapshotOf = (state: FormState) => JSON.stringify({ ...toPayload(state), published_at: state.publishDate })

export default function BlogPostForm ({ post }: { post?: AdminPost }) {
    const router = useRouter()
    const { notify } = useToast()
    const isNew = !post

    const [state, setState] = React.useState(() => toFormState(post))
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => snapshotOf(state))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)

    const isDirty = snapshotOf(state) !== savedSnapshot
    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))
    const minutes = readingMinutes(toPlainText(state.content))
    const isScheduled = state.status === "published" && state.publishDate > new Date().toISOString().slice(0, 10)

    async function handleSave () {
        const parsed = blogPostInputSchema.safeParse(toPayload(state))
        if (!parsed.success) {
            setErrors(zodErrorsToRecord(parsed.error))
            notify(parsed.error.issues.find(issue => issue.path[0] === "content")?.message ?? "Fix the highlighted fields.", "error")
            return
        }
        setErrors({})
        setSaving(true)
        const result = await adminFetch<{ id: string }>(isNew ? "/api/admin/blog-posts" : `/api/admin/blog-posts/${post.id}`, { json: parsed.data })
        setSaving(false)
        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            notify(result.error.issues?.find(issue => issue.path === "content")?.message ?? result.error.message, "error")
            return
        }
        const next = { ...state, publishDate: utcDate(parsed.data.published_at), originalPublishedAt: parsed.data.published_at, slugLocked: true }
        setState(next)
        setSavedSnapshot(snapshotOf(next))
        notify(isNew ? "Post created." : "Saved.")
        if (isNew) router.replace(`/admin/blog/${result.data.id}`)
        else router.refresh()
    }

    async function handleDelete () {
        if (!post || !window.confirm(`Delete "${post.title}"? This can't be undone.`)) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/blog-posts/${post.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(snapshotOf(state))
        notify("Post deleted.")
        router.replace("/admin/blog")
        router.refresh()
    }

    return (
        <form onSubmit={event => { event.preventDefault(); void handleSave() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/blog" className="text-sm text-muted hover:text-white">← All posts</Link>
                <h1 className="mt-2 text-2xl font-bold break-words md:text-3xl">{isNew ? "New post" : post.title}</h1>
            </div>

            <Card title="Post">
                <TextField
                    label="Title"
                    value={state.title}
                    onChange={event => {
                        const title = event.target.value
                        setState(current => ({ ...current, title, slug: current.slugLocked ? current.slug : slugify(title) }))
                    }}
                    error={errors.title}
                    maxLength={160}
                    required
                />
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="post-slug" className="text-sm font-medium text-fg/90">URL slug</label>
                    <div className="flex items-center gap-2">
                        <span className="hidden shrink-0 text-sm text-dim sm:inline">/blog/</span>
                        <input
                            id="post-slug"
                            value={state.slug}
                            onChange={event => setState(current => ({ ...current, slug: event.target.value.toLowerCase(), slugLocked: true }))}
                            aria-invalid={Boolean(errors.slug)}
                            aria-describedby="post-slug-help"
                            maxLength={100}
                            className={inputClass}
                        />
                        <button
                            type="button"
                            onClick={() => setState(current => ({ ...current, slugLocked: !current.slugLocked, slug: current.slugLocked ? slugify(current.title) : current.slug }))}
                            aria-label={state.slugLocked ? "Unlock slug (follow the title)" : "Lock slug"}
                            title={state.slugLocked ? "Unlock: follow the title" : "Lock the slug"}
                            className={iconButtonClass}
                        >
                            {state.slugLocked ? <FiLock aria-hidden="true" /> : <FiUnlock aria-hidden="true" />}
                        </button>
                    </div>
                    <p id="post-slug-help" className={`text-xs ${errors.slug ? "text-rose-400" : "text-dim"}`}>
                        {errors.slug ?? (state.slugLocked ? "Locked. Changing it later breaks old links." : "Follows the title until you edit it.")}
                    </p>
                </div>
            </Card>

            <section aria-label="Body" className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-bold">Body</h2>
                    <p className="text-xs text-muted">{minutes} min read</p>
                </div>
                <BlogEditor value={state.content} onChange={doc => set("content", doc)} onError={message => notify(message, "error")} invalid={Boolean(errors.content)} />
                {errors.content && <p className="text-xs text-rose-400" role="alert">{errors.content}</p>}
            </section>

            <Card title="Summary & sharing">
                <TextAreaField
                    label="Excerpt"
                    rows={3}
                    value={state.excerpt}
                    onChange={event => set("excerpt", event.target.value)}
                    error={errors.excerpt}
                    hint={`${state.excerpt.length}/300 · Shown on the blog cards. Leave empty to use the first lines of the post.`}
                    maxLength={300}
                />
                <TextAreaField
                    label="SEO description"
                    rows={2}
                    value={state.seo_description}
                    onChange={event => set("seo_description", event.target.value)}
                    error={errors.seo_description}
                    hint={`${state.seo_description.length}/200 · For search results. Falls back to the excerpt.`}
                    maxLength={200}
                />
                <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-fg/90">Share image (optional)</span>
                        <ImageUpload
                            bucket="site-images"
                            folder="blog"
                            resize={1600}
                            path={state.cover_path}
                            url={state.cover_url}
                            onChange={value => setState(current => ({ ...current, cover_path: value?.path ?? null, cover_url: value?.url ?? null }))}
                            aspectClass="aspect-[1200/630]"
                            error={errors.cover_path}
                        />
                        <p className="text-xs text-dim">Used when the post is shared on social media.</p>
                    </div>
                    <TextField
                        label="Originally published at (optional)"
                        type="url"
                        placeholder="https://yourname.substack.com/p/…"
                        value={state.canonical_url}
                        onChange={event => set("canonical_url", event.target.value)}
                        error={errors.canonical_url}
                        hint="Adds an “Originally published on …” note and tells search engines where the original lives."
                        maxLength={300}
                    />
                </div>
            </Card>

            <Card title="Publishing">
                <div className="grid gap-5 md:grid-cols-2">
                    <SelectField label="Status" value={state.status} onChange={event => set("status", event.target.value as FormState["status"])} error={errors.status}>
                        <option value="draft">Draft (hidden)</option>
                        <option value="published">Published</option>
                    </SelectField>
                    <TextField
                        label="Publish date"
                        type="date"
                        value={state.publishDate}
                        onChange={event => set("publishDate", event.target.value)}
                        error={errors.published_at}
                        hint={isScheduled ? "Scheduled: goes live on this date (UTC)." : "Leave empty for today. Past dates are fine for older articles."}
                        className="scheme-dark"
                    />
                </div>
            </Card>

            <SaveBar
                isNew={isNew}
                isDirty={isDirty}
                saving={saving}
                deleting={deleting}
                createLabel="Create post"
                onDelete={handleDelete}
                viewHref={post?.status === "published" ? `/blog/${post.slug}` : undefined}
            />
        </form>
    )
}
