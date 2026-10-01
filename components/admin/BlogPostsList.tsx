"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiEdit2, FiExternalLink, FiTrash2 } from "react-icons/fi"
import { useDialog } from "@/components/admin/Dialog"
import { iconButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { adminFetch } from "@/lib/admin/client"
import type { AdminPostListItem } from "@/lib/admin/blog-queries"
import { formatPostDate } from "@/lib/blog/schema"

type Status = "Draft" | "Published" | "Scheduled"

const STATUS_STYLES: Record<Status, string> = {
    Draft: "bg-white/8 text-muted",
    Published: "bg-emerald-500/15 text-emerald-300",
    Scheduled: "bg-sky-500/15 text-sky-200",
}

export default function BlogPostsList ({ posts: initialPosts, now }: { posts: AdminPostListItem[], now: string }) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const [posts, setPosts] = React.useState(initialPosts)
    const [busy, setBusy] = React.useState(false)

    const statusOf = (post: AdminPostListItem): Status =>
        post.status === "draft" ? "Draft" : post.published_at > now ? "Scheduled" : "Published"

    async function remove (post: AdminPostListItem) {
        if (!(await confirm({ title: `Delete “${post.title}”?`, message: "The post is removed from the blog. This can't be undone.", confirmLabel: "Delete", tone: "danger" }))) return
        setBusy(true)
        const result = await adminFetch(`/api/admin/blog-posts/${post.id}/delete`, { method: "POST" })
        setBusy(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setPosts(current => current.filter(entry => entry.id !== post.id))
        notify("Post deleted.")
        router.refresh()
    }

    if (posts.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center md:p-12">
                <p className="font-semibold">No posts yet</p>
                <p className="mt-1 text-sm text-muted">Write your first article.</p>
                <Link href="/admin/blog/new" className="mt-5 inline-block text-sm font-bold text-accent-1 hover:underline">Create one →</Link>
            </div>
        )
    }

    return (
        <ul className="flex flex-col gap-3">
            {posts.map(post => {
                const status = statusOf(post)
                return (
                    <li key={post.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4 md:flex-row md:items-center md:gap-5">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/admin/blog/${post.id}`} className="min-w-0 truncate font-bold hover:text-accent-1">{post.title}</Link>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${STATUS_STYLES[status]}`}>{status}</span>
                            </div>
                            <p className="mt-1 text-sm text-muted">
                                {formatPostDate(post.published_at)} · {post.reading_minutes} min read · /blog/{post.slug}
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 border-t border-white/6 pt-3 md:border-0 md:pt-0">
                            <Link href={`/admin/blog/${post.id}`} aria-label={`Edit ${post.title}`} className={iconButtonClass}>
                                <FiEdit2 aria-hidden="true" />
                            </Link>
                            {status === "Published" && (
                                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${post.title} on the site`} className={iconButtonClass}>
                                    <FiExternalLink aria-hidden="true" />
                                </a>
                            )}
                            <button type="button" onClick={() => remove(post)} disabled={busy} aria-label={`Delete ${post.title}`} className={`${iconButtonClass} hover:border-rose-500 hover:text-rose-400`}>
                                <FiTrash2 aria-hidden="true" />
                            </button>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
