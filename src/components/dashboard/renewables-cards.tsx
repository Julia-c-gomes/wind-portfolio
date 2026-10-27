/** Wind & solar cards for the renewables dashboard (same bento language as bento-cards). */
import { Sun, Wind } from "lucide-react"
import { useState } from "react"

import { BentoCard, Chip, HAIR, Legend, smoothPath, TickBar, type TipRow, useGrow, useSize, useTween } from "@/components/ui/finance-bento"
import { fmtDay, fmtGW, fmtTime, INSTALLED_MW, type GridModel } from "@/lib/eskom"
import { Head, type OnTip } from "./bento-cards"
import { INFO } from "./info"

type TileProps = { m: GridModel; className?: string; index?: number }

const WIND = "#8fb0ff"
const SOLAR = "#ff9a6b"
const gw = (mw: number, d = 2) => (mw / 1000).toFixed(d)

export function WindTile({ m, className, index }: TileProps) {
  const now = m.wind.latest?.v ?? 0
  const v = useTween(now)
  return (
    <BentoCard variant="solid" label="Wind output, latest hour" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap onLight info={INFO.windNow} title="Wind output, latest hour">Wind · latest hour</Head>
        <Wind className="size-5 shrink-0" aria-hidden />
      </div>
      <div className="mt-auto flex items-end gap-2">
        <span className="fb-big text-[46px] xl:text-[52px]">{gw(v)}</span>
        <span className="fb-mono pb-1.5 text-[14px] font-medium">GW</span>
      </div>
      <div className="fb-muted mt-1 truncate text-[11.5px]">
        {Math.round((now / INSTALLED_MW.wind) * 100)}% of the {gw(INSTALLED_MW.wind, 1)} GW fleet · {m.wind.latest ? fmtTime(m.wind.latest.t) : "–"}
      </div>
    </BentoCard>
  )
}

export function SolarTile({ m, className, index }: TileProps) {
  const peak = m.solar.peak
  const v = useTween(peak?.v ?? 0)
  return (
    <BentoCard variant="glass" label="Solar peak this week" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap info={INFO.solarPeak}>Solar peak · week</Head>
        <Sun className="size-5 shrink-0 text-white/60" aria-hidden />
      </div>
      <div className="mt-3">
        <span className="fb-big text-[38px]">
          {gw(v)}
          <span className="fb-mono ml-1 text-[13px] font-medium tracking-normal text-white/60">GW</span>
        </span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span className="fb-muted">{peak ? fmtTime(peak.t) : "–"}</span>
        <Chip style={{ background: "rgba(255,255,255,.12)" }}>PV + CSP</Chip>
      </div>
    </BentoCard>
  )
}

export function CapacityTile({ m, className, index }: TileProps) {
  const cf = useTween(m.wind.cf * 100)
  return (
    <BentoCard variant="glass" label="Wind capacity factor" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap info={INFO.capacity}>Capacity factor</Head>
        <span className="fb-muted">{Math.round(m.days)}-day avg</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="fb-big text-[38px]">
          {cf.toFixed(1)}
          <span className="fb-mono ml-1 text-[13px] font-medium tracking-normal text-white/60">% wind</span>
        </span>
        <span className="fb-mono text-[12.5px] text-white/70">PV {(m.solar.cfPv * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-auto">
        <div className="fb-muted mb-1 flex justify-between text-[11px]">
          <span>0</span>
          <span>{gw(INSTALLED_MW.wind, 1)} GW installed</span>
        </div>
        <TickBar fraction={m.wind.cf} />
      </div>
    </BentoCard>
  )
}

/** Average wind and solar output by hour of day: the two shapes fill each other's gaps. */
export function ComplementCard({ m, onTip, onHide, className, index }: TileProps & { onTip: OnTip; onHide: () => void }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>()
  const g = useGrow(m.generatedAt, 1200)
  const [hover, setHover] = useState<number | null>(null)
  const data = m.reProfile
  const hi = Math.ceil(Math.max(...data.flatMap((d) => [d.wind, d.solar]), 1) / 1000) * 1000
  const L = 34
  const R = w - 14
  const T = 14
  const B = h - 22
  const X = (hr: number) => L + (hr / 23) * (R - L)
  const Y = (v: number) => B - (v / hi) * (B - T)
  const pts = (k: "wind" | "solar") => data.map((d) => [X(d.hour), B - (B - Y(d[k])) * g] as [number, number])
  const area = (k: "wind" | "solar") => `${smoothPath(pts(k))}L${R},${B}L${L},${B}Z`
  const best = (p: { label: string; wind: number; solar: number }, k: "wind" | "solar") => `${p.label} (${fmtGW(p[k])})`

  return (
    <BentoCard tone="blue" label="Wind and solar by hour" className={className} index={index}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Head info={INFO.complement}>Wind &amp; sun, by hour</Head>
          <div className="fb-muted mt-1 text-white/75">
            Solar peaks at {best(m.solarBest, "solar")}, wind at {best(m.windBest, "wind")}
          </div>
        </div>
        <Legend
          items={[
            { label: "Wind", color: WIND },
            { label: "Solar", color: SOLAR },
          ]}
        />
      </div>
      <div ref={ref} className="relative mt-2 min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label={`Average solar output peaks at ${best(m.solarBest, "solar")}; wind at ${best(m.windBest, "wind")}`}>
            <defs>
              <linearGradient id="cc-wind" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={WIND} stopOpacity={0.55} />
                <stop offset="1" stopColor={WIND} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="cc-solar" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={SOLAR} stopOpacity={0.7} />
                <stop offset="1" stopColor={SOLAR} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            {[0, hi / 2, hi].map((t) => (
              <g key={t}>
                <line x1={L} x2={R} y1={Y(t)} y2={Y(t)} stroke={HAIR} />
                <text x={L - 8} y={Y(t) + 3.5} textAnchor="end" fontSize={10} fill="rgba(255,255,255,.65)" fontFamily="Geist Mono">
                  {gw(t, 0)}
                </text>
              </g>
            ))}
            {[0, 6, 12, 18, 23].map((hr) => (
              <text key={hr} x={X(hr)} y={h - 4} textAnchor="middle" fontSize={10.5} fontWeight={500} fill="rgba(255,255,255,.75)" fontFamily="Geist Mono">
                {String(hr).padStart(2, "0")}
              </text>
            ))}
            <path d={area("solar")} fill="url(#cc-solar)" />
            <path d={area("wind")} fill="url(#cc-wind)" />
            <path d={smoothPath(pts("solar"))} fill="none" stroke={SOLAR} strokeWidth={2.2} />
            <path d={smoothPath(pts("wind"))} fill="none" stroke={WIND} strokeWidth={2.2} />
            {hover != null && (
              <>
                <line x1={X(hover)} x2={X(hover)} y1={T} y2={B} stroke="#fff" strokeOpacity={0.5} />
                <circle cx={X(hover)} cy={Y(data[hover].wind)} r={4} fill="#fff" stroke={WIND} strokeWidth={2} />
                <circle cx={X(hover)} cy={Y(data[hover].solar)} r={4} fill="#fff" stroke={SOLAR} strokeWidth={2} />
              </>
            )}
            <rect
              x={L - 10}
              width={R - L + 20}
              height={h}
              fill="transparent"
              onPointerMove={(e) => {
                const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                const hr = Math.max(0, Math.min(23, Math.round(((e.clientX - r.left - L) / (R - L)) * 23)))
                const d = data[hr]
                setHover(hr)
                const rows: TipRow[] = [
                  ["Avg wind", fmtGW(d.wind, 2), WIND],
                  ["Avg solar", fmtGW(d.solar, 2), SOLAR],
                  ["Together", fmtGW(d.wind + d.solar, 2)],
                ]
                onTip(r.left + X(hr), r.top + Y(Math.max(d.wind, d.solar)), `${d.label} · hour beginning`, rows)
              }}
              onPointerLeave={() => {
                setHover(null)
                onHide()
              }}
            />
          </svg>
        )}
      </div>
      <p className="fb-muted mt-2 text-[11px] text-white/70">Wind capacity factor, day by day</p>
      <div className="mt-1.5 flex gap-1">
        {m.wind.byDay.map((d) => (
          <div key={d.date} className="min-w-0 flex-1" title={`${fmtDay(d.date + " 00:00")}: wind at ${Math.round(d.cf * 100)}% of capacity`}>
            <div className="h-1.5 rounded-full bg-white/15">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, d.cf * 100 * g)}%`, background: WIND }} />
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}
