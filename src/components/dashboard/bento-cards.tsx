import { ArrowUp, Info } from "lucide-react"
import { useId, useState, type PointerEvent } from "react"

import {
  ACC,
  BentoCard,
  Chip,
  DotNumber,
  HAIR,
  InfoButton,
  type InfoContent,
  Legend,
  Seg,
  smoothPath,
  T3,
  TickBar,
  useGrow,
  useSize,
  useTween,
  type TipRow,
} from "@/components/ui/finance-bento"
import {
  fmtDay,
  fmtGW,
  fmtGWh,
  fmtRand,
  fmtTime,
  billSaving,
  loadShift,
  PEAK_HOURS,
  PEAKER_COST_R_PER_KWH,
  recommendations,
  seasonOf,
  SOLAR_HOURS,
  type GridModel,
} from "@/lib/eskom"
import { cn } from "@/lib/utils"
import { INFO } from "./info"

/** Card title (or caption) with its "i" explainer beside it. */
export function Head({ children, info, cap = false, onLight = false, title }: { children: string; info: InfoContent; cap?: boolean; onLight?: boolean; title?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className={cap ? "fb-cap" : "fb-ttl"}>{children}</div>
      <InfoButton title={title ?? children} info={info} onLight={onLight} />
    </div>
  )
}

export type OnTip = (x: number, y: number, title: string, rows: TipRow[]) => void
type CardProps = { m: GridModel; onTip: OnTip; onHide: () => void; className?: string; index?: number }

const COL = { coal: "#A9B2FF", other: "#FFB37A", renew: "#7CEBC4" }
const shortDay = (t: string) => fmtDay(t).split(" ").slice(0, 2).join(" ").replace(",", "")
const gw = (mw: number, d = 1) => (mw / 1000).toFixed(d)

/* ───────────── Supply / demand stream (hero) ───────────── */

export type StreamMode = "Supply" | "Demand"

export function StreamCard({ m, mode, onTip, onHide, className, index }: CardProps & { mode: StreamMode }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>()
  const g = useGrow(mode)
  const maskId = useId().replace(/:/g, "")

  const supply = mode === "Supply"
  const pts = supply
    ? m.mix.map((p) => ({ t: p.t, coal: p.coal, other: p.nuclear + p.hydro + p.peakers, renew: p.renewables, fc: false }))
    : m.demandSeries.map((p) => ({ t: p.t, coal: (p.actual ?? p.forecast ?? 0) as number, other: 0, renew: 0, fc: p.actual == null }))
  const tot = (p: (typeof pts)[number]) => p.coal + p.other + p.renew
  const n = pts.length
  const lastActual = supply ? n - 1 : pts.map((p) => !p.fc).lastIndexOf(true)
  const latest = pts[lastActual] ? tot(pts[lastActual]) : 0
  const first = pts[0] ? tot(pts[0]) : 0
  const change = first ? ((latest - first) / first) * 100 : 0

  // Stacked area from a zero baseline: band heights are proportional to GW.
  const top = 30
  const base = h - 30
  const tots = pts.map(tot)
  const mx = Math.max(...tots)
  const ymax = Math.max(5000, Math.ceil((mx * 1.06) / 5000) * 5000)
  const X = (i: number) => -20 + (i / Math.max(1, n - 1)) * (w + 40)
  const yOf = (v: number) => base - (v / ymax) * (base - top) * g
  const band = (sel: (p: (typeof pts)[number]) => number) => {
    if (!n || !w) return ""
    const T = pts.map((p, i) => [X(i), yOf(sel(p))] as [number, number])
    return smoothPath(T) + `L${X(n - 1)},${base}L${X(0)},${base}Z`
  }
  const gridVals = Array.from({ length: Math.floor(ymax / 10000) }, (_, k) => (k + 1) * 10000)

  // three annotated moments
  const peakIdx = tots.slice(0, lastActual + 1).reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0)
  const fPeakIdx = supply ? -1 : tots.reduce((bi, v, i) => (pts[i].fc && (bi < 0 || v > tots[bi]) ? i : bi), -1)
  const marks = (supply ? [Math.round((n - 1) * 0.2), peakIdx, n - 1] : [peakIdx, lastActual, fPeakIdx]).filter((i, k, a) => i >= 0 && a.indexOf(i) === k)
  const splitX = X(lastActual)

  const [hover, setHover] = useState<number | null>(null)
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const x = e.clientX - r.left
    const i = Math.max(0, Math.min(n - 1, Math.round(((x + 20) / (w + 40)) * (n - 1))))
    const p = pts[i]
    setHover(i)
    onTip(
      r.left + X(i),
      r.top + yOf(tot(p)),
      fmtTime(p.t),
      supply
        ? [
            ["Wind & solar", `${gw(p.renew)} GW`, COL.renew],
            ["Nuclear, hydro, imports, peakers", `${gw(p.other)} GW`, COL.other],
            ["Coal", `${gw(p.coal)} GW`, COL.coal],
            ["Total", `${gw(tot(p))} GW`],
          ]
        : [[p.fc ? "Forecast" : "Actual", `${gw(p.coal)} GW`, p.fc ? ACC : COL.coal]],
    )
  }

  return (
    <BentoCard tone="blue" label={`${mode} stream`} className={className} index={index}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Head info={supply ? INFO.supply : INFO.demand}>{supply ? "Supply" : "Demand"}</Head>
        <Legend
          items={
            supply
              ? [
                  { label: "Coal", color: COL.coal },
                  { label: "Nuclear, hydro & peakers", color: COL.other },
                  { label: "Wind & solar", color: COL.renew },
                ]
              : [
                  { label: "Actual", color: COL.coal },
                  { label: "Eskom forecast", color: ACC },
                ]
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <div className="flex items-end gap-2">
          <DotNumber value={latest} format={(v) => Math.round(v).toLocaleString("en-US")} pitch={w < 480 ? 5 : 7} label={`${Math.round(latest)} megawatts`} />
          <span className="fb-mono pb-0.5 text-[13px] text-white/70">MW</span>
        </div>
        <div className="pb-1">
          <div className="fb-delta">
            {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </div>
          <div className="fb-muted mt-0.5">
            {supply ? "supplied" : "demand"} at {pts[lastActual] ? fmtTime(pts[lastActual].t) : ""} vs start of period
          </div>
        </div>
      </div>
      <div ref={ref} className="relative -mx-[22px] -mb-5 mt-2 min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label={supply ? `Hourly supply by source over ${Math.round(m.days)} days, latest ${gw(latest)} gigawatts` : `Hourly demand and Eskom forecast, latest ${gw(latest)} gigawatts`}>
            <defs>
              <linearGradient id={`f${maskId}`} x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset=".18" stopColor="#fff" stopOpacity="1" />
              </linearGradient>
              <mask id={`m${maskId}`}>
                <rect width={w} height={h} fill={`url(#f${maskId})`} />
              </mask>
              <clipPath id={`a${maskId}`}>
                <rect x={-30} width={splitX + 30} height={h} />
              </clipPath>
              <clipPath id={`b${maskId}`}>
                <rect x={splitX} width={w - splitX + 30} height={h} />
              </clipPath>
            </defs>
            {gridVals.map((v) => (
              <g key={v}>
                <line x1={0} x2={w} y1={yOf(v)} y2={yOf(v)} stroke="rgba(255,255,255,.16)" strokeDasharray="2 4" />
                <text x={24} y={yOf(v) - 5} fontSize={10} fill="rgba(255,255,255,.7)" fontFamily="Geist Mono">
                  {v / 1000} GW
                </text>
              </g>
            ))}
            <line x1={0} x2={w} y1={base} y2={base} stroke="rgba(255,255,255,.3)" />
            <g mask={`url(#m${maskId})`}>
              {supply ? (
                <>
                  <path d={band((p) => p.coal + p.other + p.renew)} fill={COL.renew} opacity={0.95} />
                  <path d={band((p) => p.coal + p.other)} fill={COL.other} />
                  <path d={band((p) => p.coal)} fill={COL.coal} />
                </>
              ) : (
                <>
                  <path d={band((p) => p.coal)} fill={COL.coal} clipPath={`url(#a${maskId})`} />
                  <path d={band((p) => p.coal)} fill={ACC} opacity={0.8} clipPath={`url(#b${maskId})`} />
                </>
              )}
            </g>
            {marks.map((i, k) => {
              const x = Math.min(w - 40, Math.max(40, X(i)))
              return (
                <g key={i} style={{ opacity: g > 0.6 ? 1 : 0, transition: `opacity .4s ${k * 0.08}s` }}>
                  <line x1={x} x2={x} y1={top - 4} y2={base + 4} stroke="rgba(0,0,0,.55)" strokeWidth={1.5} />
                  <rect x={x - 36} y={top - 14} width={72} height={22} rx={11} fill="#000" />
                  <text x={x} y={top + 1} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff" fontFamily="Geist Mono">
                    {gw(tots[i])} GW
                  </text>
                  <rect x={x - 32} y={base - 8} width={64} height={22} rx={11} fill="#000" />
                  <text x={x} y={base + 7} textAnchor="middle" fontSize={10.5} fontWeight={500} fill="rgba(255,255,255,.7)" fontFamily="Geist Mono">
                    {shortDay(pts[i].t)}
                  </text>
                </g>
              )
            })}
            {hover != null && <line x1={X(hover)} x2={X(hover)} y1={top} y2={base} stroke="#fff" strokeWidth={1.5} />}
            <rect
              width={w}
              height={h}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => {
                setHover(null)
                onHide()
              }}
            />
          </svg>
        )}
      </div>
    </BentoCard>
  )
}

/* ───────────── Energy mix gauge ───────────── */

export function MixCard({ m, className, index }: Omit<CardProps, "onTip" | "onHide">) {
  const coal = m.energy.coal
  const renew = m.energy.renewables
  const other = m.totalEnergy - coal - renew
  const fr = { coal: coal / m.totalEnergy, other: other / m.totalEnergy, renew: renew / m.totalEnergy }
  const ticks = 56
  const pct = useTween(fr.renew * 100)
  const rows = [
    ["Coal", fr.coal, coal, COL.coal],
    ["Nuclear, hydro & peakers", fr.other, other, COL.other],
    ["Wind & solar", fr.renew, renew, COL.renew],
  ] as const
  return (
    <BentoCard tone="graph" label="Energy mix" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head info={INFO.mix}>Energy mix</Head>
        <Chip style={{ background: "rgba(255,255,255,.12)" }}>{Math.round(m.days)} days</Chip>
      </div>
      <svg viewBox="-150 -146 300 160" className="mx-auto mt-1 block min-h-0 w-full max-w-[300px] flex-1" role="img" aria-label={`Wind and solar ${pct.toFixed(1)} percent of energy supplied`}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const f = i / ticks
          const cls = f <= fr.coal ? "coal" : f <= fr.coal + fr.other ? "other" : "renew"
          const a = ((180 + f * 180) * Math.PI) / 180
          const r1 = 136
          const r2 = i % 7 === 0 ? 112 : 118
          return (
            <line
              key={i}
              x1={(r1 * Math.cos(a)).toFixed(1)}
              y1={(r1 * Math.sin(a)).toFixed(1)}
              x2={(r2 * Math.cos(a)).toFixed(1)}
              y2={(r2 * Math.sin(a)).toFixed(1)}
              stroke={COL[cls]}
              strokeWidth={3.2}
              strokeLinecap="round"
              style={{ opacity: 0, animation: `fbtk .4s ${i * 12}ms forwards` }}
            />
          )
        })}
        <text y={-26} textAnchor="middle" fontFamily="Geist" fontWeight={200} fontSize={52} fill="#fff" letterSpacing={-2}>
          {pct.toFixed(1)}
          <tspan fontSize={17} dy={-24} fill="rgba(255,255,255,.56)">
            %
          </tspan>
        </text>
        <text y={-4} textAnchor="middle" fontSize={12} fontWeight={500} fill={T3} fontFamily="Geist">
          wind &amp; solar
        </text>
      </svg>
      <div className="mt-1">
        {rows.map(([k, f, e, c], i) => (
          <div key={k} className="flex h-[30px] items-center gap-3" style={i ? { borderTop: "1px solid rgba(255,255,255,.1)" } : undefined}>
            <i className="size-2 shrink-0 rounded-full" style={{ background: c }} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{k}</span>
            <span className="fb-mono fb-muted w-11 text-right">{Math.round(f * 100)}%</span>
            <span className="fb-mono w-[78px] text-right text-[13px]">{fmtGWh(e, 0)}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

/* ───────────── KPI tiles ───────────── */

export function PeakTile({ m, className, index }: Omit<CardProps, "onTip" | "onHide">) {
  const v = useTween(m.peak?.demand ?? 0)
  return (
    <BentoCard variant="solid" label="Peak demand this week" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap onLight info={INFO.peak} title="Peak demand this week">Peak demand · week</Head>
        {m.peak && <Chip>{fmtTime(m.peak.t).split(", ").slice(-1)[0]}</Chip>}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <ArrowUp className="size-8 shrink-0" strokeWidth={2.4} aria-hidden />
        <span className="fb-big text-[46px] xl:text-[52px]">{gw(v)}</span>
        <span className="fb-mono self-end pb-1.5 text-[14px] font-medium">GW</span>
      </div>
      <div className="fb-muted mt-1 truncate text-[11.5px]">Highest hour · {m.peak ? fmtDay(m.peak.t) : "–"}</div>
    </BentoCard>
  )
}

export function OutageTile({ m, className, index }: Omit<CardProps, "onTip" | "onHide">) {
  const latest = m.outageLatest?.unplanned ?? 0
  const v = useTween(latest)
  const wk = m.outageWeekAgo?.unplanned
  const d = wk != null ? latest - wk : null
  return (
    <BentoCard variant="glass" label="Unplanned outages" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap info={INFO.outages}>Unplanned outages</Head>
        <span className="fb-muted">UCLF + OCLF</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="fb-big text-[38px]">
          {gw(v)}
          <span className="fb-mono ml-1 text-[13px] font-medium tracking-normal text-white/60">GW</span>
        </span>
        {d != null && (
          <span className="fb-mono text-[12.5px]" style={{ color: d <= 0 ? ACC : "#FFB37A" }}>
            {d <= 0 ? "↓" : "↑"} {Math.abs(d / 1000).toFixed(1)} vs 7 d
          </span>
        )}
      </div>
      <div className="mt-auto">
        <div className="fb-muted mb-1 flex justify-between text-[11px]">
          <span>0</span>
          <span>15-day high {gw(m.outageMax)} GW</span>
        </div>
        <TickBar fraction={m.outageMax ? latest / m.outageMax : 0} />
      </div>
    </BentoCard>
  )
}

export function ForecastTile({ m, className, index }: Omit<CardProps, "onTip" | "onHide">) {
  return (
    <BentoCard variant="glass" label="Forecast peaks" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap info={INFO.forecast}>Forecast peaks</Head>
        <span className="fb-mono fb-muted">{m.fPeak ? `${gw(m.fPeak.forecast ?? 0)} GW max` : ""}</span>
      </div>
      <div className="mt-2">
        {m.forecastPeaks.length === 0 && <p className="fb-muted mt-3">Eskom hasn't published a forecast.</p>}
        {m.forecastPeaks.map((r, i) => (
          <div key={r.t} className="flex h-[30px] items-center gap-3" style={i ? { borderTop: "1px solid rgba(255,255,255,.08)" } : undefined}>
            <i className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/10 text-[11px] font-semibold not-italic">{fmtDay(r.t).slice(0, 1)}</i>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{fmtDay(r.t)}</span>
            <span className="fb-mono fb-muted text-[11.5px]">{r.t.slice(11, 16)}</span>
            <span className="fb-mono w-[62px] text-right text-[13px]">{gw(r.forecast ?? 0)} GW</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

export function RenewTile({ m, className, index }: Omit<CardProps, "onTip" | "onHide">) {
  const v = useTween(m.reShare * 100)
  const tot = m.reSplit.wind + m.reSplit.solar + m.reSplit.other || 1
  const parts = [
    ["Wind", m.reSplit.wind / tot],
    ["Solar", m.reSplit.solar / tot],
    ["Other", m.reSplit.other / tot],
  ] as const
  return (
    <BentoCard variant="glass" label="Renewable share" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head cap info={INFO.renew}>Renewables</Head>
        <span className="fb-muted">share of supply</span>
      </div>
      <div className="mt-3">
        <span className="fb-big text-[38px]">
          {v.toFixed(1)}
          <span className="fb-mono ml-1 text-[13px] font-medium tracking-normal text-white/60">%</span>
        </span>
      </div>
      <div className="mt-auto">
        <div className="flex h-1.5 gap-[3px]">
          {parts.map(([k, f], i) => (
            <div key={k} className="rounded-[3px]" style={{ flex: `0 0 calc(${f * 100}% - 2px)`, background: `rgba(255,255,255,${[0.95, 0.6, 0.32][i]})` }} />
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {parts.map(([k, f]) => (
            <span key={k} className="fb-mono text-[11.5px] whitespace-nowrap text-white/70">
              {k} {Math.round(f * 100)}%
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  )
}

/* ───────────── Typical day (waves) ───────────── */

export function DayCard({ m, shiftMW, onTip, onHide, className, index }: CardProps & { shiftMW: number }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>()
  const g = useGrow(m.generatedAt, 1200)
  const add = (shiftMW * PEAK_HOURS.length) / SOLAR_HOURS.length
  const data = m.profile.map((p) => ({
    ...p,
    shifted: p.demand - (PEAK_HOURS.includes(p.hour) ? shiftMW : 0) + (SOLAR_HOURS.includes(p.hour) ? add : 0),
  }))
  const all = data.flatMap((d) => [d.demand, d.shifted])
  const lo = Math.floor((Math.min(...all) - 1200) / 2000) * 2000
  const hi = Math.ceil((Math.max(...all) + 600) / 2000) * 2000
  const L = 40
  const R = w - 18
  const T = 18
  const B = h - 22
  const X = (hr: number) => L + (hr / 23) * (R - L)
  const Y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T)
  const ticks = [lo, lo + (hi - lo) / 2, hi]
  const [hover, setHover] = useState<number | null>(null)
  const line = (k: "demand" | "shifted") => smoothPath(data.map((d) => [X(d.hour), B - (B - Y(d[k])) * g] as [number, number]))

  return (
    <BentoCard tone="pink" label="Average day" className={className} index={index}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Head info={INFO.day}>Average day</Head>
          <div className="fb-muted mt-1 text-white/70">
            Each hour averaged over 7 days · peak <span className="fb-mono" style={{ color: ACC }}>+{fmtGW(m.peakHour.demand - m.middayTrough)}</span> above midday at {m.peakHour.label}
          </div>
        </div>
        <Legend items={[{ label: "Avg demand", color: "#fff" }, ...(shiftMW > 0 ? [{ label: "After shift", color: ACC, dashed: true }] : [])]} />
      </div>
      <div ref={ref} className="relative mt-2 min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label={`Average demand by hour peaks at ${m.peakHour.label} at ${fmtGW(m.peakHour.demand)}`}>
            <rect x={X(SOLAR_HOURS[0])} y={T - 10} width={X(SOLAR_HOURS.at(-1)!) - X(SOLAR_HOURS[0])} height={B - T + 10} rx={10} fill="rgba(255,255,255,.12)" />
            <rect x={X(PEAK_HOURS[0])} y={T - 10} width={X(PEAK_HOURS.at(-1)!) - X(PEAK_HOURS[0])} height={B - T + 10} rx={10} fill="rgba(0,0,0,.22)" />
            <text x={(X(SOLAR_HOURS[0]) + X(SOLAR_HOURS.at(-1)!)) / 2} y={T + 4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.8)" fontFamily="Geist Mono">
              solar window
            </text>
            <text x={(X(PEAK_HOURS[0]) + X(PEAK_HOURS.at(-1)!)) / 2} y={T + 4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.8)" fontFamily="Geist Mono">
              peak
            </text>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={R} y1={Y(t)} y2={Y(t)} stroke={HAIR} />
                <text x={L - 10} y={Y(t) + 3.5} textAnchor="end" fontSize={10} fill="rgba(255,255,255,.6)" fontFamily="Geist Mono">
                  {gw(t, 0)}
                </text>
              </g>
            ))}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hr) => (
              <text key={hr} x={X(hr)} y={h - 4} textAnchor="middle" fontSize={10.5} fontWeight={500} fill="rgba(255,255,255,.75)" fontFamily="Geist Mono">
                {String(hr).padStart(2, "0")}
              </text>
            ))}
            <path d={line("demand")} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
            {shiftMW > 0 && <path d={line("shifted")} fill="none" stroke={ACC} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />}
            {hover != null && (
              <>
                <line x1={X(hover)} x2={X(hover)} y1={T} y2={B} stroke="#fff" strokeOpacity={0.5} />
                <circle cx={X(hover)} cy={Y(data[hover].demand)} r={4} fill="#fff" stroke="#ff2a85" strokeWidth={2} />
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
                const rows: TipRow[] = [["Avg demand", fmtGW(d.demand, 2), "#fff"], ["Avg solar", fmtGW(d.solar, 2)]]
                if (shiftMW > 0) rows.push(["After shift", fmtGW(d.shifted, 2), ACC])
                onTip(r.left + X(hr), r.top + Y(d.demand), `${d.label} · hour beginning`, rows)
              }}
              onPointerLeave={() => {
                setHover(null)
                onHide()
              }}
            />
          </svg>
        )}
      </div>
    </BentoCard>
  )
}

/* ───────────── Optimisation (what-if + recommendations) ───────────── */

const PRIORITY_STYLE = { High: { background: "#000", color: ACC }, Medium: { background: "rgba(0,0,0,.6)", color: "#fff" }, Info: { background: "rgba(0,0,0,.35)", color: "rgba(255,255,255,.8)" } }

export function OptimiseCard({ m, shiftMW, onShift, className, index }: Omit<CardProps, "onTip" | "onHide"> & { shiftMW: number; onShift: (v: number) => void }) {
  const r = loadShift(m, shiftMW)
  const bill = billSaving(shiftMW)
  const season = seasonOf()
  const [view, setView] = useState<"Eskom" | "Customers">("Eskom")
  const diesel = view === "Eskom"
  const saved = useTween(diesel ? r.randPerWeek : bill[season].perWeek, 500)
  const recs = recommendations(m)
  const [open, setOpen] = useState<string | null>(null)
  const max = 3000
  return (
    <BentoCard tone="copper" label="Optimisation" className={className} index={index}>
      <div className="flex items-center justify-between gap-2">
        <Head info={diesel ? INFO.optimise : INFO.bill} title={diesel ? "Optimisation: what Eskom saves" : "Optimisation: what customers save"}>
          Optimisation
        </Head>
        <Seg label="Whose saving" options={["Eskom", "Customers"] as const} value={view} onChange={setView} />
      </div>
      <p className="mt-1 truncate text-[12px] text-white/85">
        {diesel
          ? `What Eskom saves: less diesel at the evening peak (at ~R${PEAKER_COST_R_PER_KWH}/kWh).`
          : `What businesses save on Eskom's Megaflex tariff (≈ ${fmtRand(bill.perYear)} a year).`}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3">
        <span className="fb-big text-[34px]">
          {fmtRand(saved)}
          <span className="fb-muted ml-1 text-[13px] tracking-normal text-white/70">/ week</span>
        </span>
        <span className="fb-delta pb-1">
          {diesel
            ? `↓ ${fmtGWh(r.avoidedMWhPerWeek)} peakers · peak −${(r.peakCut * 100).toFixed(1)}%`
            : `R${bill[season].perKWh.toFixed(2)}/kWh moved · ${season === "high" ? "winter" : "Sep–May"}`}
        </span>
      </div>
      <label htmlFor="shift" className="mt-2 flex items-baseline justify-between text-[12.5px] font-medium text-white/85">
        <span>Move load from 17:00–21:00 to 10:00–15:00</span>
        <span className="fb-mono">{shiftMW.toLocaleString("en-ZA")} MW</span>
      </label>
      <input
        id="shift"
        type="range"
        min={0}
        max={max}
        step={100}
        value={shiftMW}
        onChange={(e) => onShift(Number(e.target.value))}
        className="fb-range"
        style={{ ["--fill" as string]: `${(shiftMW / max) * 100}%` }}
      />
      <ul
        className="no-scrollbar -mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-18px),transparent)]"
        aria-label="Recommendations"
      >
        {recs.map((rec, i) => {
          const isOpen = open === rec.id
          return (
            <li key={rec.id} style={i ? { borderTop: "1px solid rgba(255,255,255,.14)" } : undefined} className="py-1.5">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : rec.id)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg text-left"
              >
                <Chip style={PRIORITY_STYLE[rec.priority]}>{rec.priority}</Chip>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{rec.title}</span>
                  <span className="block truncate text-[11.5px] text-white/70">{rec.short}</span>
                </span>
                <Info className={cn("size-4 shrink-0 transition-opacity", isOpen ? "opacity-100" : "opacity-60")} aria-hidden />
              </button>
              {isOpen && <p className="mt-1.5 text-[12px] leading-snug text-white/85">{rec.body}</p>}
            </li>
          )
        })}
      </ul>
    </BentoCard>
  )
}
