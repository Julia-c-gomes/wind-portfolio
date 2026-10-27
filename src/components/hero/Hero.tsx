import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ArrowDown, ArrowUpRight } from "lucide-react"
import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { profile } from "@/content/portfolio"
import { useGridSnapshot } from "@/lib/grid-data"
import { useReduced } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { HeroState } from "./TurbineScene"
import { Streamlines } from "./Streamlines"
import { TurbineSvg } from "./TurbineSvg"

const TurbineScene = lazy(() => import("./TurbineScene"))

/** If the 3D scene throws (lost GPU, old driver), keep the vector turbine. */
class SceneBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function canUseWebGL() {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

function isLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900
  return phone || (nav.hardwareConcurrency || 4) <= 4 || (nav.deviceMemory ?? 8) <= 4 || !!nav.connection?.saveData
}

const LABELS = [
  { title: "Rotor", line: "Lift turns wind into shaft torque", formula: "P = ½ ρ A v³ Cₚ" },
  { title: "Nacelle", line: "Gearbox and generator: shaft work to electricity", formula: "η ≈ 0.95" },
  { title: "Tower", line: "Wind is faster higher up, and power goes with v³", formula: "h ≈ 100 m" },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReduced()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const snap = useGridSnapshot()

  const state = useRef<HeroState>({ progress: 0, omega: 0.9, gust: 0, reduced })
  const labels = useRef<(HTMLElement | null)[]>([])
  // With reduced motion the hero is one screen: no pinning, no camera moves.
  useMotionValueEvent(p, "change", (v) => (state.current.progress = reduced ? 0 : v))
  useEffect(() => {
    state.current.reduced = reduced
  }, [reduced])
  // Idle speed follows the grid: 0.5 rad/s when still, ~1.7 rad/s at half of installed wind.
  useEffect(() => {
    if (snap) state.current.omega = 0.5 + 2.4 * Math.min(1, snap.windCF)
  }, [snap])

  // Blades react to the visitor: moving the mouse across the hero blows on them, a click or tap is a gust.
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const blow = (amount: number) => (state.current.gust = Math.min(7, state.current.gust + amount))
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    const now = performance.now()
    const last = lastPointer.current
    lastPointer.current = { x: e.clientX, y: e.clientY, t: now }
    if (last) blow((Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(16, now - last.t)) * 0.08)
  }

  // 3D only where WebGL exists; start it after first paint so text shows instantly.
  const [use3D, setUse3D] = useState(false)
  const [lowPower, setLowPower] = useState(true)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setLowPower(isLowPower())
    const id = requestAnimationFrame(() => setUse3D(canUseWebGL()))
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" })
    if (ref.current) io.observe(ref.current)
    return () => {
      cancelAnimationFrame(id)
      io.disconnect()
    }
  }, [])

  // Scroll choreography (0 → 1 across the pinned hero)
  const bg = useTransform(p, [0.62, 0.92], ["#eaedf6", "#0b0f1c"])
  const copyOpacity = useTransform(p, [0.14, 0.3], [1, 0])
  const copyY = useTransform(p, [0.14, 0.3], [0, -60])
  const eqOpacity = useTransform(p, [0.32, 0.42, 0.58, 0.66], [0, 1, 1, 0])
  const eqY = useTransform(p, [0.32, 0.42], [30, 0])
  const sceneOpacity = useTransform(p, [0.8, 0.97], [1, 0])
  const hillsOpacity = useTransform(p, [0.6, 0.82], [1, 0])
  const cueOpacity = useTransform(p, [0, 0.06], [1, 0])

  return (
    <section id="home" ref={ref} aria-labelledby="hero-title" className={cn("relative", reduced ? "h-dvh min-h-[620px]" : "h-[280vh]")}>
      <motion.div
        className="sticky top-0 h-dvh overflow-hidden"
        style={{ backgroundColor: reduced ? "#eaedf6" : bg }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => (lastPointer.current = null)}
        onPointerDown={() => blow(3)}
      >
        {/* Bernoulli streamlines + soft light */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={reduced ? undefined : { opacity: hillsOpacity }}>
          <Streamlines className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_55%_45%,#000_25%,transparent_78%)]" />
          <div className="absolute -top-40 right-[-10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,#fff_0%,rgb(255_255_255/0)_65%)]" />
          <Hill className="absolute inset-x-0 bottom-[9vh] h-[22vh] w-full text-[#d6ddef]" d="M0 120 C180 60 330 70 480 95 C650 125 760 40 1000 70 L1000 200 L0 200Z" />
        </motion.div>

        {/* turbine: vector poster first, 3D crossfades in when ready */}
        <motion.div aria-hidden className="absolute inset-0" style={reduced ? undefined : { opacity: sceneOpacity }}>
          <TurbineSvg
            still={reduced}
            className={cn(
              "absolute transition-opacity duration-700",
              "top-[40%] left-1/2 h-[66%] -translate-x-1/2 md:top-[9%] md:right-[2%] md:left-auto md:h-[96%] md:translate-x-0",
              ready ? "opacity-0" : "opacity-100",
            )}
          />
          {use3D && (
            <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
              <SceneBoundary onFail={() => setUse3D(false)}>
                <Suspense fallback={null}>
                  <TurbineScene state={state} labels={labels} active={visible} lowPower={lowPower} onReady={() => setReady(true)} />
                </Suspense>
              </SceneBoundary>
            </div>
          )}
        </motion.div>

        <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[17vh]" style={reduced ? undefined : { opacity: hillsOpacity }}>
          <Hill className="absolute inset-0 h-full w-full text-[#c8d1e8]" d="M0 70 C140 30 300 30 430 55 C600 88 800 20 1000 45 L1000 200 L0 200Z" />
        </motion.div>

        {/* engineering notes: an "i" pinned to each part, text on hover, focus or tap */}
        {ready && (
          <motion.div className="pointer-events-none absolute inset-0 z-20" style={reduced ? undefined : { opacity: sceneOpacity }}>
            {LABELS.map((l, i) => (
              <Hotspot key={l.title} note={l} setRef={(el) => void (labels.current[i] = el)} />
            ))}
          </motion.div>
        )}
        {/* copy */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col px-5 pt-[calc(var(--nav-h)+5vh)] sm:px-8 md:justify-center md:pt-[var(--nav-h)]">
          <motion.div style={reduced ? undefined : { opacity: copyOpacity, y: copyY }} className="max-w-[640px]">
            <h1 id="hero-title" className="font-display text-[clamp(48px,min(9.5vw,15.5vh),148px)] leading-[0.86] font-extrabold tracking-[-0.045em] text-navy uppercase">
              <span className="block">{profile.first}</span>
              <span className="text-outline block text-blue">{profile.last}</span>
            </h1>
            <p className="mt-[min(20px,2.4vh)] text-[clamp(20px,2.3vw,32px)] leading-[1.15] font-medium tracking-[-0.025em] text-navy">
              {profile.headline} <em className="font-serif text-[1.15em] font-normal text-blue">{profile.headlineAccent}</em>
            </p>
            <p className="mt-4 hidden max-w-[440px] text-[15.5px] leading-relaxed text-ink-soft sm:block">{profile.intro}</p>
            <div className="mt-[min(28px,3.4vh)] flex flex-wrap gap-3">
              <a
                href="#about"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-blue px-6 text-[15px] font-medium text-white shadow-[0_12px_30px_-12px_rgb(58_108_244/.8)] transition-transform duration-300 hover:-translate-y-0.5"
              >
                Open the folders
                <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
              </a>
              <Link
                to="/grid"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-navy/20 bg-white/50 px-5 text-[15px] font-medium text-navy backdrop-blur transition-colors hover:bg-white"
              >
                Live grid dashboard <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </motion.div>

          {/* phase 2: the equation behind every turn */}
          <motion.div
            aria-hidden={!reduced}
            style={reduced ? { display: "none" } : { opacity: eqOpacity, y: eqY }}
            className="pointer-events-none absolute top-[calc(var(--nav-h)+4vh)] left-5 max-w-[420px] sm:left-8 md:top-1/2 md:-translate-y-1/2"
          >
            <p className="font-mono text-[11px] tracking-[0.2em] text-blue uppercase">Every turn is an energy balance</p>
            <p className="mt-3 font-serif text-[clamp(40px,6vw,84px)] leading-none text-navy italic">
              P = ½ρAv³C<sub className="text-[0.5em]">p</sub>
            </p>
            <p className="mt-4 hidden text-[15px] leading-relaxed text-ink-soft md:block">
              Double the wind speed and the power goes up eight times. No turbine can catch more than 59.3% of it (the Betz limit). I like problems
              that come down to a balance like this.
            </p>
          </motion.div>

        </div>

        <motion.p
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] text-ink-soft uppercase sm:bottom-auto sm:top-[calc(var(--nav-h)+18px)] sm:right-8 sm:left-auto sm:translate-x-0"
        >
          Scroll or click to spin the blades <ArrowDown className="size-3.5 animate-bounce" />
        </motion.p>
      </motion.div>
    </section>
  )
}

type Note = (typeof LABELS)[number]

function Hotspot({ note, setRef }: { note: Note; setRef: (el: HTMLDivElement | null) => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div ref={setRef} className={cn("absolute top-0 left-0 will-change-transform", open && "z-10")}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        aria-label={`About the ${note.title.toLowerCase()}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="group pointer-events-auto absolute -top-[22px] -left-[22px] grid size-11 place-items-center rounded-full"
      >
        <span aria-hidden className="absolute size-7 animate-[pulse-dot_2.6s_ease-in-out_infinite] rounded-full bg-white/50" />
        <span
          aria-hidden
          className="relative grid size-6 place-items-center rounded-full bg-white font-serif text-[15px] text-blue italic shadow-[0_4px_14px_-4px_rgb(19_26_44/.45)] ring-1 ring-navy/10 transition-transform duration-300 group-hover:scale-110"
        >
          i
        </span>
      </button>
      {open && (
        <div
          id={id}
          role="tooltip"
          className="pointer-events-none absolute top-5 right-6 w-[min(240px,64vw)] animate-in rounded-2xl border border-white/70 bg-white/90 p-3.5 shadow-[0_18px_40px_-20px_rgb(19_26_44/.55)] backdrop-blur-md fade-in-0 zoom-in-95"
        >
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-blue uppercase">{note.title}</p>
          <p className="mt-1 text-[13px] leading-snug font-medium text-navy">{note.line}</p>
          <p className="mt-1 font-serif text-[18px] text-ink-soft italic">{note.formula}</p>
        </div>
      )}
    </div>
  )
}

function Hill({ className, d }: { className: string; d: string }) {
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={d} fill="currentColor" />
    </svg>
  )
}
