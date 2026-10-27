import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ChevronDown, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { profile, sections } from "@/content/portfolio"
import { cn } from "@/lib/utils"

/** Which section's anchor was passed last (anchors are static, so pinned folders don't confuse it). */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const update = () => {
      raf = 0
      const line = window.innerHeight * 0.45
      let idx = 0
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= line) idx = i
      })
      setActive(idx)
    }
    const onScroll = () => (raf ||= requestAnimationFrame(update))
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [enabled])
  return active
}

function jump(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (id === "home") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  history.replaceState(null, "", "#/")
}

export function SiteNav() {
  const { pathname } = useLocation()
  const onGrid = pathname.startsWith("/grid")
  const active = useActiveSection(!onGrid)
  const [open, setOpen] = useState(false)
  const [showName, setShowName] = useState(false)
  const count = (n: number) => String(n).padStart(2, "0")

  // the name tucks itself away again after a few seconds
  useEffect(() => {
    if (!showName) return
    const id = window.setTimeout(() => setShowName(false), 3200)
    return () => clearTimeout(id)
  }, [showName])

  useEffect(() => setOpen(false), [pathname, active])

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-5">
      <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-2">
        {/* brand: just the photo; the name slides out when it's clicked */}
        <Link
          to="/"
          onClick={() => {
            if (!onGrid) jump("home")
            setShowName(true)
          }}
          className="nav-glass flex h-12 items-center rounded-full p-1 text-sky"
          aria-label={`${profile.name}, home`}
        >
          <img src="./avatar.webp" alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />
          <AnimatePresence initial={false}>
            {showName && (
              <motion.span
                aria-hidden
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden font-display text-[13px] font-bold tracking-[-0.02em] whitespace-nowrap uppercase sm:text-[14px]"
              >
                <span className="block px-3">{profile.name}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* sections */}
        {!onGrid && (
          <nav aria-label="Sections" className="relative">
            <div className="nav-glass hidden h-12 items-center gap-0.5 rounded-full p-1 text-sky lg:flex">
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    jump(s.id)
                  }}
                  aria-current={i === active ? "location" : undefined}
                  className={cn(
                    "relative flex h-10 items-center rounded-full px-3.5 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors duration-300 xl:px-4",
                    i === active ? "text-white" : "text-mist hover:text-sky",
                  )}
                >
                  {i === active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-blue" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <span className="relative">{s.label}</span>
                </a>
              ))}
            </div>

            {/* compact: counter + current section, opens a list */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="section-menu"
              className="nav-glass flex h-12 items-center gap-2.5 rounded-full px-4 text-sky lg:hidden"
            >
              <span className="text-[12.5px] font-semibold tracking-[0.06em] uppercase">{sections[active].label}</span>
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence>
              {open && (
                <motion.ul
                  id="section-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2 }}
                  className="nav-glass absolute top-[calc(100%+8px)] left-1/2 w-56 -translate-x-1/2 rounded-3xl p-2 text-sky lg:hidden"
                >
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          setOpen(false)
                          jump(s.id)
                        }}
                        aria-current={i === active ? "location" : undefined}
                        className={cn("flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium", i === active ? "bg-blue text-white" : "hover:bg-white/10")}
                      >
                        <span className="font-mono text-[11px] opacity-60">{count(i + 1)}</span>
                        {s.label}
                      </a>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </nav>
        )}

        {/* route switch */}
        {onGrid ? (
          <Link to="/" className="nav-glass flex h-12 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-sky">
            <ArrowLeft className="size-4" aria-hidden /> Portfolio
          </Link>
        ) : (
          <Link
            to="/grid"
            className="flex h-12 items-center gap-2 rounded-full bg-lime px-4 text-[13px] font-semibold text-navy shadow-[0_10px_30px_-12px_rgb(194_248_79/.7)] transition-transform hover:-translate-y-0.5 sm:px-5"
            aria-label="Live grid dashboard"
          >
            <Zap className="size-4" aria-hidden />
            <span className="hidden sm:inline">Live grid</span>
          </Link>
        )}
      </div>
    </header>
  )
}
