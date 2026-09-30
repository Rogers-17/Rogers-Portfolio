import Image from "next/image"

// A full-width "window" onto a fixed background: the page scrolls while the background
// stays put. clip-path on the band clips the position:fixed layer to the band, which
// (unlike background-attachment: fixed) also works on iOS Safari.

const CODE = [
    "export async function getSubscription(userId: string) {",
    "  const { data, error } = await supabase",
    "    .from('subscriptions')",
    "    .select('id, plan, status, current_period_end')",
    "    .eq('user_id', userId)",
    "    .maybeSingle()",
    "",
    "  if (error) throw new Error(error.message)",
    "  const monthly = data?.plan === 'monthly'",
    "  const cancelAtPeriodEnd = data?.cancel_at_period_end === true",
    "",
    "  return {",
    "    ...data,",
    "    isActive: data?.status === 'active' || !!data?.trial_end,",
    "    renewsAt: new Date(data.current_period_end * 1000),",
    "  }",
    "}",
    "",
    "// Show the plan badge only when the tenant view can display it",
    "const badge = restore.FieldValue.delete()",
    "SELECT id, plan, status FROM subscriptions",
    "  WHERE plan_expires_at > now()",
    "  AND pro_expires_at IS NOT NULL",
    "  ORDER BY created_at DESC;",
    "",
    "for (const u of matching) console.log(`-> ${u.email}`)",
    "export default function Dashboard({ user }: Props) {",
    "  const [open, setOpen] = useState(false)",
    "  return <Shell user={user} onToggle={() => setOpen(!open)} />",
    "}",
]

const TOKEN_COLORS = ["text-sky-300/80", "text-fuchsia-300/70", "text-emerald-300/70", "text-slate-200/80", "text-amber-200/70"]

function CodeLines () {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_60%_40%,#2b3140_0%,#161a24_55%,#0b0d14_100%)]">
            <div className="absolute -inset-[20%] flex origin-center transform-[perspective(1400px)_rotateY(-24deg)_rotateX(10deg)_rotateZ(-4deg)] flex-col justify-center gap-[0.35em] font-mono text-[15px] leading-none whitespace-pre blur-[0.6px] md:text-[22px] lg:text-[26px]">
                {[...CODE, ...CODE].map((line, index) => (
                    <div key={index} className="flex gap-[1.2em]">
                        <span className="w-[2.5em] shrink-0 text-right text-slate-500/60">{(index % CODE.length) + 12}</span>
                        <span className={TOKEN_COLORS[(index * 7) % TOKEN_COLORS.length]}>{line || " "}</span>
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_50%,transparent_0%,rgba(5,0,10,0.55)_100%)]" />
        </div>
    )
}

export default function CodeWindow ({ imageUrl }: { imageUrl: string | null }) {
    return (
        <div aria-hidden="true" className="relative h-[42vh] min-h-64 [clip-path:inset(0)] md:h-[60vh] md:min-h-96">
            <div className="fixed inset-0">
                {imageUrl ? <Image src={imageUrl} alt="" fill sizes="100vw" className="object-cover" /> : <CodeLines />}
                <div className="absolute inset-0 bg-black/30" />
            </div>
            <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-surface to-transparent md:h-24" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface to-transparent md:h-24" />
        </div>
    )
}
