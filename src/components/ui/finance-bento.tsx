/**
 * Bento design primitives, adapted from "Finance Bento" by vasnev.art
 * (https://vasnev.art). The original renders a personal-finance dashboard with
 * imperative DOM/SVG; here its visual language (gradient cards with a blurred
 * core, rim light, lime accent, dot-matrix numerals, tick gauges, segmented
 * controls, glass tooltips) is rebuilt as typed React pieces so it can be fed
 * any data — in this project, Eskom grid data. Styles live in index.css (.fb-*).
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

export const ACC = "#C2F84F"
export const T2 = "rgba(255,255,255,.56)"
export const T3 = "rgba(255,255,255,.38)"
export const HAIR = "rgba(255,255,255,.14)"

export const GRADIENTS = {
  blue: { top: "#b9a6ff", base: "#2e43ff", bottom: "#6d7dff", core: "#05082a" },
  graph: { top: "#9a9aa8", base: "#3a3a44", bottom: "#55555f", core: "#060608" },
  pink: { top: "#ffb3d6", base: "#ff2a85", bottom: "#ff6aa8", core: "#3a031c" },
  copper: { top: "#f6bf96", base: "#c2683a", bottom: "#dc8a5c", core: "#1d0b05" },
  green: { top: "#a6e8c8", base: "#36956f", bottom: "#58b58c", core: "#061d15" },
  lime: { top: "#f4ffb8", base: "#a3c400", bottom: "#c9e03a", core: "#121700" },
}
export type Tone = keyof typeof GRADIENTS

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/* ───────────────────────── card ───────────────────────── */

export function BentoCard({
  tone,
  variant = "tone",
  label,
  className,
  style,
  children,
  index = 0,
}: {
  tone?: Tone
  variant?: "tone" | "glass" | "solid"
  label: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  index?: number
}) {
  const g = tone ? GRADIENTS[tone] : null
  return (
    <section
      aria-label={label}
      className={cn("fb-card", variant === "glass" && "fb-glass", variant === "solid" && "fb-solid", className)}
      style={{ ...style, transitionDelay: `${index * 60}ms` }}
    >
      {g && variant !== "glass" && (
        <>
          <div
            aria-hidden
            className="fb-g"
            style={{ background: `linear-gradient(180deg,${g.top} 0%,${g.base} 36%,${g.base} 74%,${g.bottom} 100%)` }}
          />
          <div aria-hidden className="fb-core" style={{ background: g.core }} />
        </>
      )}
      <div className="fb-in">{children}</div>
      {variant !== "glass" && <div aria-hidden className="fb-rim" />}
    </section>
  )
}

/* ─────────────────────── hooks ─────────────────────── */

/** Element size via ResizeObserver (charts draw to their card's real size). */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** Animates a number toward `target` (eased); instant with reduced motion. */
export function useTween(target: number, dur = 900) {
  const [v, setV] = useState(reduceMotion() ? target : 0)
  const from = useRef(v)
  useEffect(() => {
    if (reduceMotion()) {
      setV(target)
      return
    }
    const start = from.current
    const t0 = performance.now()
    let raf = 0
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const x = start + (target - start) * easeOut(t)
      from.current = x
      setV(x)
      if (t < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return v
}

/** 0→1 grow-in progress for charts, restarted whenever `key` changes. */
export function useGrow(key: unknown, dur = 1100) {
  const [g, setG] = useState(reduceMotion() ? 1 : 0)
  useEffect(() => {
    if (reduceMotion()) {
      setG(1)
      return
    }
    setG(0)
    const t0 = performance.now()
    let raf = 0
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      setG(easeOut(t))
      if (t < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [key, dur])
  return g
}

/* ─────────────────────── geometry ─────────────────────── */

export function smoothPath(P: [number, number][], move = true) {
  if (!P.length) return ""
  let d = `${move ? "M" : "L"}${P[0][0]},${P[0][1]}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[i + 2] || p2
    const k = 0.17
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`
  }
  return d
}

/* ─────────────────── dot-matrix number ─────────────────── */

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ",": ["0", "0", "0", "0", "0", "1", "1"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  " ": ["00", "00", "00", "00", "00", "00", "00"],
}

/** The signature LED-style numeral. `value` counts up; `format` turns it into glyphs. */
export function DotNumber({ value, format, pitch = 7, label }: { value: number; format: (v: number) => string; pitch?: number; label: string }) {
  const v = useTween(value)
  const text = format(v)
  const cols: { on: boolean[]; w: number }[] = []
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[" "]
    const w = g[0].length
    for (let k = 0; k < w; k++) cols.push({ on: g.map((row) => row[k] === "1"), w })
    cols.push({ on: Array(7).fill(false), w: 1 })
  }
  cols.pop()
  const W = cols.length * pitch
  const H = 7 * pitch
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block shrink-0">
      {cols.map((c, x) =>
        c.on.map((on, y) => (
          <circle
            key={`${x}-${y}`}
            cx={x * pitch + pitch / 2}
            cy={y * pitch + pitch / 2}
            r={pitch * 0.36}
            fill="#fff"
            opacity={on ? 1 : 0.08}
            style={{ transform: on ? "none" : "scale(.55)", transformBox: "fill-box", transformOrigin: "center", transition: "opacity .26s, transform .26s" }}
          />
        )),
      )}
    </svg>
  )
}

/* ─────────────────────── ticks ─────────────────────── */

/** Row of tick marks filled up to `fraction` (the runway / goal bars). */
export function TickBar({ fraction, n = 36, height = 20, major = 6 }: { fraction: number; n?: number; height?: number; major?: number }) {
  const [ref, { w }] = useSize<HTMLDivElement>()
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height} aria-hidden className="block">
          {Array.from({ length: n }, (_, i) => {
            const x = 1 + (i * (w - 2)) / (n - 1)
            const on = i / (n - 1) <= fraction
            return (
              <line
                key={i}
                x1={x}
                x2={x}
                y1={i % major === 0 ? 2 : 8}
                y2={height}
                stroke={on ? ACC : "rgba(255,255,255,.28)"}
                strokeWidth={1.6}
                strokeLinecap="round"
                style={{ transition: `stroke .2s ${i * 14}ms` }}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}

/* ─────────────────────── controls ─────────────────────── */

export function Seg<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="fb-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function Chip({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("fb-chip", className)} style={style}>
      {children}
    </span>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="fb-legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={i.dashed ? { background: "transparent", border: `1.5px dashed ${i.color}` } : { background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/* ─────────────────────── tooltip ─────────────────────── */

export type TipRow = [label: string, value: string, color?: string]
export type TipState = { x: number; y: number; title: string; rows: TipRow[] } | null

/** Glass tooltip, positioned in viewport coordinates and kept on-screen. */
export function Tip({ tip }: { tip: TipState }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  useLayoutEffect(() => {
    if (!tip || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    let left = tip.x + 16
    let top = tip.y - r.height - 14
    if (left + r.width > window.innerWidth - 8) left = tip.x - r.width - 16
    if (top < 8) top = tip.y + 16
    setPos({ left, top })
  }, [tip])
  return (
    <div ref={ref} className={cn("fb-tip", tip && "on")} style={pos} aria-hidden>
      {tip && (
        <>
          <div className="t">{tip.title}</div>
          {tip.rows.map(([k, v, c]) => (
            <div className="r" key={k}>
              <span>
                {c && <i style={{ background: c }} />}
                {k}
              </span>
              <b>{v}</b>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ─────────────────────── info panel ─────────────────────── */

export type InfoContent = { source: string; how: string; why: string }

/**
 * Small "i" button that opens a glass panel explaining a card: data source,
 * method, and why it matters. Rendered in a portal so tight cards never clip it;
 * closes on Escape, outside click, scroll or resize.
 */
export function InfoButton({ title, info, onLight = false }: { title: string; info: InfoContent; onLight?: boolean }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties>({})
  const id = useId()

  useLayoutEffect(() => {
    if (!open || !btn.current || !panel.current) return
    const b = btn.current.getBoundingClientRect()
    const p = panel.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = b.right - p.width
    if (left < 12) left = 12
    if (left + p.width > vw - 12) left = vw - 12 - p.width
    let top = b.bottom + 8
    if (top + p.height > vh - 12) top = Math.max(12, b.top - p.height - 8)
    setPos({ left, top })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        btn.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) close()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onDown)
    window.addEventListener("resize", close)
    window.addEventListener("scroll", close, true)
    panel.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("resize", close)
      window.removeEventListener("scroll", close, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`How "${title}" is calculated`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn("fb-info", onLight && "fb-info-light")}
      >
        i
      </button>
      {open &&
        createPortal(
          <div ref={panel} id={id} role="dialog" aria-label={`About ${title}`} tabIndex={-1} className="fb-pop" style={pos}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-[14px] font-semibold text-white">{title}</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fb-pop-x">
                ✕
              </button>
            </div>
            <dl className="space-y-2.5">
              <div>
                <dt>Source</dt>
                <dd>{info.source}</dd>
              </div>
              <div>
                <dt>How it's calculated</dt>
                <dd>{info.how}</dd>
              </div>
              <div>
                <dt>Why it matters</dt>
                <dd>{info.why}</dd>
              </div>
            </dl>
          </div>,
          document.body,
        )}
    </>
  )
}
