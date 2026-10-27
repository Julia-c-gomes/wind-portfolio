import { motion } from "framer-motion"
import { ArrowUpRight, Mail } from "lucide-react"

import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons"
import { contact, profile } from "@/content/portfolio"
import { useReduced } from "@/lib/motion"

/** Green keyword strip under the hero (pauses on hover, still with reduced motion). */
export function Ticker() {
  const words = [...profile.ticker, ...profile.ticker]
  return (
    <div className="ticker-wrap relative z-10 overflow-hidden border-y border-black/10 bg-green py-3 text-[#08160a]" aria-label="Focus areas">
      <ul className="ticker">
        {words.map((w, i) => (
          <li key={i} aria-hidden={i >= profile.ticker.length} className="flex items-center gap-6 pr-6 font-mono text-[12px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase">
            {w}
            <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden>
              <path d="M10 10 L10 1 M10 10 L2.2 14.5 M10 10 L17.8 14.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A cluster of small turbines at the foot of the page, each at its own pace.
 * s = size, d = seconds per turn. The tallest poke up over the contact card.
 */
const FARM = [
  { x: 330, s: 0.5, d: 7.4 },
  { x: 395, s: 0.75, d: 5.6 },
  { x: 455, s: 0.6, d: 6.6 },
  { x: 520, s: 1, d: 4.6 },
  { x: 580, s: 0.7, d: 6 },
  { x: 640, s: 1.15, d: 4.2 },
  { x: 700, s: 0.8, d: 5.3 },
  { x: 760, s: 1, d: 4.8 },
  { x: 815, s: 0.65, d: 6.4 },
  { x: 870, s: 0.85, d: 5 },
  { x: 925, s: 0.55, d: 7 },
  { x: 975, s: 0.7, d: 5.8 },
]

function WindFarm() {
  return (
    // negative top margin (a % of the width, so it scales) pulls the farm up over the card's bottom edge
    <svg
      viewBox="0 0 1260 190"
      preserveAspectRatio="xMidYMax meet"
      overflow="visible"
      className="relative z-10 -mx-4 mt-[-7%] block h-auto w-[calc(100%+2rem)] sm:-mx-8 sm:w-[calc(100%+4rem)]"
      aria-hidden
    >
      <path d="M0 182 C220 170 420 150 640 148 C860 146 1060 168 1260 178 L1260 190 L0 190Z" fill="#131a2c" />
      {FARM.map((t, i) => {
        const h = 120 * t.s
        // sit each tower on the hill
        const base = 150 + Math.abs(t.x - 640) * 0.04 + (i % 2) * 3
        const hubY = base - h
        const r = 48 * t.s
        return (
          <g key={t.x} opacity={0.55 + Math.min(t.s, 1) * 0.45}>
            <path d={`M${t.x - 1.3 * t.s} ${hubY} L${t.x + 1.3 * t.s} ${hubY} L${t.x + 3.2 * t.s} ${base} L${t.x - 3.2 * t.s} ${base}Z`} fill="#3b445e" />
            <g className="farm-rotor" style={{ transformOrigin: `${t.x}px ${hubY}px`, ["--d" as string]: `${t.d}s`, animationDelay: `${-i * 0.7}s` }}>
              {[0, 120, 240].map((a) => (
                <path
                  key={a}
                  transform={`rotate(${a} ${t.x} ${hubY})`}
                  d={`M${t.x - 1.7 * t.s} ${hubY} Q${t.x - 2.6 * t.s} ${hubY - r * 0.5} ${t.x} ${hubY - r} Q${t.x + 3.8 * t.s} ${hubY - r * 0.45} ${t.x + 2.1 * t.s} ${hubY}Z`}
                  fill={i % 4 === 1 ? "#c2f84f" : "#a3abc2"}
                />
              ))}
            </g>
            <circle cx={t.x} cy={hubY} r={2.6 * t.s} fill="#eaedf6" />
          </g>
        )
      })}
    </svg>
  )
}

export function Contact() {
  const reduced = useReduced()
  const icons = { email: Mail, linkedin: LinkedinIcon, github: GithubIcon, internal: ArrowUpRight }
  return (
    <section id="contact" aria-labelledby="contact-title" className="on-dark relative overflow-hidden bg-deep px-4 text-sky sm:px-8">
      <div className="mx-auto max-w-[1240px] rounded-[32px] bg-navy px-6 pt-14 pb-8 sm:px-12 sm:pt-20">
        <p className="font-mono text-[11px] tracking-[0.22em] text-lime uppercase">{contact.eyebrow}</p>
        <motion.h2
          id="contact-title"
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 max-w-[14ch] font-display text-[clamp(40px,7.5vw,112px)] leading-[0.9] font-extrabold tracking-[-0.05em] uppercase"
        >
          {contact.title.split(" ").slice(0, -2).join(" ")} <span className="text-outline text-lime [--outline-fill:var(--navy)]">{contact.title.split(" ").slice(-2).join(" ")}</span>
        </motion.h2>
        <p className="mt-6 max-w-[460px] text-[16px] leading-relaxed text-mist">{contact.body}</p>

        <a
          href={`mailto:${profile.email}`}
          className="group mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-6 transition-colors hover:border-lime/50"
        >
          <span className="font-display text-[clamp(20px,3.6vw,46px)] font-semibold tracking-[-0.04em] break-all">{profile.email}</span>
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-lime text-navy transition-transform duration-500 group-hover:rotate-45">
            <ArrowUpRight className="size-6" aria-hidden />
          </span>
        </a>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {contact.links.map((l) => {
            const Icon = icons[l.kind]
            return (
              <a
                key={l.href}
                href={l.href}
                {...(l.kind !== "email" && { target: "_blank", rel: "noreferrer" })}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[14.5px] font-medium transition-colors hover:bg-white hover:text-navy"
              >
                <Icon className="size-4" aria-hidden /> {l.label}
              </a>
            )
          })}
        </div>

        <footer className="mt-16 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[11px] tracking-[0.08em] text-mist uppercase">
          <p>
            © 2026 {profile.name} · {profile.location}
          </p>
        </footer>
      </div>
      <WindFarm />
    </section>
  )
}
