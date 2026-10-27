import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { useEffect, useRef, useState, type RefObject } from "react"

import { useReduced } from "@/lib/motion"

/**
 * A process-flow pipe in the left gutter of the folder stack, drawn as you
 * scroll (after Skiper UI's "stroke that follows the scroll"). Each folder
 * is a unit operation on the line; between them a heat-exchanger coil.
 * Geometry is measured in pixels so the stroke never distorts.
 */
export function ProcessLine({ container, x }: { container: RefObject<HTMLElement | null>; x: number }) {
  const reduced = useReduced()
  const [geo, setGeo] = useState<{ h: number; nodes: number[] } | null>(null)
  const path = useRef<SVGPathElement>(null)
  const head = useRef<SVGGElement>(null)
  const [lit, setLit] = useState(-1)

  // Head of the line rides at 55 % of the viewport.
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 55%", "end 55%"] })
  const drawn = useTransform(scrollYProgress, [0, 1], [0.002, 1])

  // useEffect, not useLayoutEffect: the parent's ref is attached after child layout effects run
  useEffect(() => {
    const el = container.current
    if (!el) return
    const measure = () => {
      const nodes = [...el.querySelectorAll<HTMLElement>("[data-node]")].map((n) => n.offsetTop + 20)
      setGeo({ h: el.offsetHeight, nodes })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [container])

  useMotionValueEvent(drawn, "change", (v) => {
    const p = path.current
    if (!p || !geo) return
    const len = p.getTotalLength()
    const pt = p.getPointAtLength(len * v)
    head.current?.setAttribute("transform", `translate(${pt.x} ${pt.y})`)
    setLit(geo.nodes.filter((n) => n <= pt.y + 2).length - 1)
  })

  if (!geo) return null
  const { h, nodes } = geo

  // straight pipe, with a small zig-zag coil halfway between each pair of nodes
  let d = `M${x} 0`
  const stops = [...nodes, h]
  stops.forEach((y, i) => {
    const prev = i ? stops[i - 1] : 0
    if (i > 0 && y - prev > 260) {
      const mid = (prev + y) / 2
      const a = 9
      d += ` L${x} ${mid - 40}`
      for (let k = 0; k < 4; k++) d += ` L${x + (k % 2 ? -a : a)} ${mid - 30 + k * 20}`
      d += ` L${x} ${mid + 40}`
    }
    d += ` L${x} ${y}`
  })

  return (
    <svg aria-hidden className="pointer-events-none absolute top-0 left-0 overflow-visible" width={x * 2} height={h}>
      {/* the empty pipe */}
      <path d={d} fill="none" stroke="rgb(255 255 255 / .09)" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {/* the flow */}
      <motion.path
        ref={path}
        d={d}
        fill="none"
        stroke="#c2f84f"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={reduced ? undefined : { pathLength: drawn }}
      />
      {nodes.map((y, i) => (
        <g key={y} transform={`translate(${x} ${y})`}>
          <circle r={13} fill="#0b0f1c" stroke={i <= lit || reduced ? "#c2f84f" : "rgb(255 255 255 / .2)"} strokeWidth={2} style={{ transition: "stroke .4s" }} />
          {/* valve: two triangles meeting at the centre */}
          <path d="M-6 -5 L6 5 L6 -5 L-6 5 Z" fill={i <= lit || reduced ? "#c2f84f" : "rgb(255 255 255 / .25)"} style={{ transition: "fill .4s" }} />
        </g>
      ))}
      {!reduced && (
        <g ref={head}>
          <circle r={9} fill="#c2f84f" opacity={0.18} />
          <circle r={4} fill="#c2f84f" />
        </g>
      )}
    </svg>
  )
}
