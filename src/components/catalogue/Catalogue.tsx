import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link as RouterLink } from "react-router-dom"

import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons"
import { folders, profile, type Folder, type Link } from "@/content/portfolio"
import { fmtTime } from "@/lib/eskom"
import { INSTALLED_MW, useGridSnapshot } from "@/lib/grid-data"
import { useReduced } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ProcessLine } from "./ProcessLine"

/** Matches the CSS rule that pins folders (index.css, .folder). */
const STACKED = "(min-width: 1024px) and (min-height: 700px)"
function useStacked() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const mq = matchMedia(STACKED)
    const f = () => setOn(mq.matches)
    f()
    mq.addEventListener("change", f)
    return () => mq.removeEventListener("change", f)
  }, [])
  return on
}

export function Catalogue() {
  const stack = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: stack, offset: ["start start", "end end"] })

  return (
    <section aria-labelledby="catalogue-title" className="on-dark relative bg-deep pt-24 pb-28 text-sky sm:pt-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="relative pl-10 md:pl-20">
          <h2
              id="catalogue-title"
              className="text-outline font-display text-[clamp(44px,10vw,132px)] leading-[0.85] font-extrabold tracking-[-0.05em] text-sky uppercase"
            >
              Catalogue
            </h2>
        </div>

        <div ref={stack} className="relative mt-20 pl-10 md:mt-28 md:pl-20">
          <ProcessLine container={stack} x={14} />
          {folders.map((f, i) => (
            <FolderCard key={f.id} folder={f} index={i} total={folders.length} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FolderCard({ folder: f, index: i, total, progress }: { folder: Folder; index: number; total: number; progress: MotionValue<number> }) {
  const reduced = useReduced()
  const depth = useStacked() && !reduced
  // Covered folders shrink back a touch, so the stack reads as depth.
  const scale = useTransform(progress, [i / total, 1], [1, 1 - (total - 1 - i) * 0.022])
  const dim = useTransform(progress, [i / total, Math.min(1, (i + 1.2) / total)], [0, i === total - 1 ? 0 : 0.18])
  const dark = f.tone === "slate"
  // the tab sits on the top-left corner only for the first folder
  const tl = i === 0 ? "rounded-tl-none" : ""
  // Skills get the whole folder width: one column, chips in a 2 × 2 grid
  const wide = !!f.chipGroups

  return (
    <>
      {/* static anchor: nav jumps and the process line use this, not the pinned card */}
      <div id={f.id} data-node className="h-0" />
      <motion.article
        aria-labelledby={`${f.id}-title`}
        className={cn("folder mt-[56px] rounded-[28px]", tl, `tone-${f.tone}`, i < total - 1 && "mb-[22vh]")}
        style={{ ["--i" as string]: i, scale: depth ? scale : 1, transformOrigin: "50% 0%" }}
      >
        <div className="folder-tab" style={{ left: `min(${i * 15}%, ${i * 150}px)` }}>
          <span>{f.label}</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </div>

        <div className={cn("folder-body relative grid h-full gap-x-10 gap-y-6 overflow-hidden rounded-[28px] p-6 sm:p-9 lg:p-11", !wide && "lg:grid-cols-[1.05fr_1fr]", tl)}>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-4">
              <h3 id={`${f.id}-title`} className="font-display text-[clamp(26px,3.2vw,44px)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
                {f.title}
              </h3>
              <p aria-hidden className={cn("text-outline shrink-0 font-display text-[44px] leading-[0.8] font-bold", !wide && "lg:hidden")}>
                {String(i + 1).padStart(2, "0")}
              </p>
            </div>
            {f.body && (
              <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed sm:text-[15.5px]" style={{ color: "var(--soft)" }}>
                {f.body}
              </p>
            )}
            {f.links && <Links links={f.links} tone={f.tone} />}
            <p aria-hidden className={cn("text-outline mt-auto hidden pt-6 font-display text-[88px] leading-[0.8] font-bold opacity-80", !wide && "lg:block")}>
              {String(i + 1).padStart(2, "0")}
              <span className="ml-2 align-top font-mono text-[13px] font-medium tracking-[0.1em] [-webkit-text-stroke:0] [-webkit-text-fill-color:var(--soft)]">
                / {String(total).padStart(2, "0")}
              </span>
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-6">
            {f.portrait && <Portrait />}
            {f.stats && <Stats stats={f.stats} />}
            {f.bullets && (
              <ol className="divide-y" style={{ borderColor: "var(--hair)" }}>
                {f.bullets.map((b, k) => (
                  <li key={b} className="flex items-center gap-4 py-3.5 text-[15.5px] leading-snug first:pt-0" style={{ borderColor: "var(--hair)" }}>
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full border-2 font-display text-[15px] font-bold"
                      style={{ borderColor: "currentColor", background: "var(--chip)" }}
                    >
                      {k + 1}
                    </span>
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ol>
            )}
            {f.chipGroups && (
              <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                {f.chipGroups.map((g) => (
                  <div key={g.label}>
                    <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--soft)" }}>
                      <i className="size-2.5 rounded-full ring-1 ring-black/20" style={{ background: g.color }} />
                      {g.label}
                    </p>
                    <ul className="mt-2.5 flex flex-wrap gap-2">
                      {g.items.map((c) => (
                        <li key={c} className="bubble rounded-full px-4 py-2 text-[15px] font-semibold sm:text-[16px]">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {f.liveGrid && <LiveGrid />}
          </div>
        </div>
        {depth && (
          <motion.div aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[28px] bg-deep", tl)} style={{ opacity: dim }} />
        )}
        {dark && <div aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[28px] border border-white/10", tl)} />}
      </motion.article>
    </>
  )
}

function Stats({ stats }: { stats: NonNullable<Folder["stats"]> }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3 sm:block sm:p-4" style={{ background: "var(--chip)" }}>
          <dt className="sr-only">{s.label}</dt>
          <dd className={cn("font-display leading-none font-semibold tracking-[-0.04em]", s.value.length > 6 ? "text-[clamp(14px,1.45vw,19px)]" : "text-[clamp(17px,2vw,26px)]")}>
            {s.value}
          </dd>
          <dd aria-hidden className="text-[12px] leading-tight font-medium sm:mt-2" style={{ color: "var(--soft)" }}>
            {s.label}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Portrait() {
  return (
    <figure className="relative mx-auto hidden w-full max-w-[300px] sm:block lg:max-w-[260px]">
      <span className="absolute -top-[26px] left-4 rounded-t-xl bg-navy px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-sky uppercase">JG · Cape Town</span>
      <div className="overflow-hidden rounded-2xl border-4 border-navy bg-navy">
        <img src="./portrait.jpg" alt={`${profile.name}`} width={720} height={987} loading="lazy" className="aspect-[4/4.2] w-full object-cover object-[50%_22%]" />
      </div>
      <figcaption className="absolute right-3 bottom-3 rounded-lg bg-navy/85 px-2.5 py-1 font-display text-[15px] font-semibold text-sky backdrop-blur">2026</figcaption>
    </figure>
  )
}

function Links({ links, tone }: { links: Link[]; tone: Folder["tone"] }) {
  const solid = tone === "lime" ? "bg-navy text-lime" : "bg-navy text-sky"
  return (
    <div className="mt-6 flex flex-wrap gap-2.5">
      {links.map((l) => {
        const cls = cn("inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold transition-transform duration-300 hover:-translate-y-0.5", solid)
        if (l.kind === "internal")
          return (
            <RouterLink key={l.href} to={l.href} className={cls}>
              {l.label} <ArrowUpRight className="size-4" aria-hidden />
            </RouterLink>
          )
        const Icon = l.kind === "email" ? Mail : l.kind === "github" ? GithubIcon : LinkedinIcon
        return (
          <a key={l.href} href={l.href} className={cls} {...(l.kind !== "email" && { target: "_blank", rel: "noreferrer" })}>
            <Icon className="size-4" /> {l.label}
          </a>
        )
      })}
    </div>
  )
}

/** Latest-hour wind & solar, straight from the dashboard data. */
function LiveGrid() {
  const s = useGridSnapshot(0)
  const cf = s ? Math.min(1, s.windCF) : 0
  return (
    <div className="rounded-3xl bg-navy p-5 text-sky sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] text-mist uppercase">
          <span className="size-2 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-lime" /> Eskom · latest hour
        </p>
        <p className="font-mono text-[11px] text-mist">{s ? fmtTime(s.t) : "loading…"}</p>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Wind", s ? `${(s.windMW / 1000).toFixed(2)}` : "–", "GW"],
          ["Solar", s ? `${(s.solarMW / 1000).toFixed(2)}` : "–", "GW"],
          ["Renewables", s ? `${(s.reShare * 100).toFixed(1)}` : "–", "%"],
        ].map(([k, v, u]) => (
          <div key={k}>
            <dt className="text-[12px] text-mist">{k}</dt>
            <dd className="mt-1 font-display text-[clamp(20px,2.4vw,30px)] leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {v}
              <span className="ml-1 font-mono text-[12px] font-medium tracking-normal text-mist">{u}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <div className="flex justify-between text-[11.5px] text-mist">
          <span>Wind fleet working at</span>
          <span className="font-mono text-lime">{Math.round(cf * 100)}% of {(INSTALLED_MW.wind / 1000).toFixed(1)} GW</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime transition-[width] duration-1000 ease-out" style={{ width: `${cf * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
