/**
 * Hero backdrop: streamlines through a venturi throat. Where the lines crowd
 * together the flow is faster (continuity, A₁v₁ = A₂v₂) and the pressure lower
 * (Bernoulli). Dashes drift along each line; still with reduced motion.
 */
const W = 1200
const H = 800
const YC = 400
const XC = 640

/** How far each line is pulled toward the axis at x: 1 = straight, smaller = pinched. */
const squeeze = (x: number) => 1 - 0.55 * Math.exp(-(((x - XC) / 230) ** 2))

const LINES = Array.from({ length: 17 }, (_, i) => {
  const y0 = 80 + i * 40
  const pts: string[] = []
  for (let x = -40; x <= W + 40; x += 20) pts.push(`${x},${(YC + (y0 - YC) * squeeze(x)).toFixed(1)}`)
  return { d: `M${pts.join(" L")}`, edge: Math.abs(y0 - YC) / (H / 2) }
})

export function Streamlines({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {LINES.map((l, i) => (
        <g key={i} opacity={1 - l.edge * 0.55}>
          <path d={l.d} fill="none" stroke="rgb(19 26 44 / .07)" strokeWidth={1} />
          <path
            d={l.d}
            fill="none"
            stroke="rgb(58 108 244 / .45)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="2 22"
            className="streamline"
            style={{ animationDelay: `${-i * 0.37}s` }}
          />
        </g>
      ))}
      {/* the two laws the picture is drawing */}
      <text x={XC + 40} y={YC + 195} textAnchor="middle" fontFamily="Geist Mono" fontSize={15} letterSpacing={1.5} fill="rgb(58 108 244 / .55)">
        A₁v₁ = A₂v₂
      </text>
      <text x={XC + 40} y={YC + 235} textAnchor="middle" fontFamily="Instrument Serif" fontStyle="italic" fontSize={22} fill="rgb(19 26 44 / .28)">
        p + ½ρv² = const
      </text>
    </svg>
  )
}
