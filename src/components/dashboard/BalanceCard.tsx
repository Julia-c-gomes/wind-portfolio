import { RotateCcw, Table2, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { BentoCard, Chip, InfoButton } from "@/components/ui/finance-bento"
import { CONSUMPTION, defaults, evaluate, landUsed, MACKAY_UK, PRODUCTION, SA, type Line, type Values } from "@/lib/balance"
import { INFO } from "./info"

const USE = "#B9A6FF" // MacKay drew consumption red; this is the Supply card purple…
const MAKE = "#C2F84F" // …and production green; lime keeps the bento accent
const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2))

type Row = { id: string; label: string; kwh: number }

/** One stacked bar, segments in descending size, separated by 2px gaps. */
function Stack({ rows, total, max, color, label }: { rows: Row[]; total: number; max: number; color: string; label: string }) {
  const sorted = [...rows].sort((a, b) => b.kwh - a.kwh)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className="fb-mono text-[13px]">
          {fmt(total)} <span className="text-white/60">kWh/d</span>
        </span>
      </div>
      <div className="relative mt-1.5 h-5 w-full rounded-[6px] bg-black/25">
        <div className="flex h-5 gap-[2px] overflow-hidden rounded-[5px]" style={{ width: `${(total / max) * 100}%` }}>
          {sorted.map((r, i) => (
            <div
              key={r.id}
              title={`${r.label}: ${fmt(r.kwh)} kWh/d`}
              style={{ flex: `${r.kwh} 0 0`, background: color, opacity: Math.max(0.28, 1 - i * 0.14), minWidth: r.kwh > 0 ? 2 : 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function BalanceCard({ eskomPerPerson, className, index }: { eskomPerPerson: number; className?: string; index?: number }) {
  const [use, setUse] = useState<Values>(() => defaults(CONSUMPTION))
  const [make, setMake] = useState<Values>(() => defaults(PRODUCTION))
  const [open, setOpen] = useState(false)
  const useRows = useMemo(() => evaluate(CONSUMPTION, use), [use])
  const makeRows = useMemo(() => evaluate(PRODUCTION, make), [make])
  const useT = useRows.reduce((a, r) => a + r.kwh, 0)
  const makeT = makeRows.reduce((a, r) => a + r.kwh, 0)
  const max = Math.max(useT, makeT) * 1.02

  return (
    <BentoCard tone="green" label="Back-of-the-envelope balance" className={className} index={index}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="fb-ttl">Back-of-the-envelope balance</div>
          <InfoButton title="Back-of-the-envelope balance (MacKay method)" info={INFO.balance} />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-black/45 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-black/65"
        >
          <Table2 className="size-3.5" aria-hidden /> Balance sheet
        </button>
      </div>
      <p className="mt-1 flex items-center gap-2 text-[11.5px] text-white/75">
        <Chip style={{ background: "rgba(0,0,0,.45)", height: 18 }}>estimates</Chip>
        kWh per person per day · not Eskom data
      </p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-3.5">
        <Stack rows={useRows} total={useT} max={max} color={USE} label="Average energy consumption" />
        <Stack rows={makeRows} total={makeT} max={max} color={MAKE} label="Optimistic energy generation" />
      </div>
      {open && (
        <BalanceSheet
          use={use}
          make={make}
          setUse={setUse}
          setMake={setMake}
          useT={useT}
          makeT={makeT}
          eskom={eskomPerPerson}
          onClose={() => setOpen(false)}
        />
      )}
    </BentoCard>
  )
}

function Column({ title, color, lines, vals, setVals, total }: { title: string; color: string; lines: Line[]; vals: Values; setVals: (v: Values) => void; total: number }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between border-b border-white/15 pb-2">
        <h3 className="text-[15px] font-semibold" style={{ color }}>
          {title}
        </h3>
        <span className="fb-mono text-[15px]">{fmt(total)} kWh/d</span>
      </div>
      <ul className="space-y-3">
        {lines.map((l) => {
          const v = Math.max(0, l.calc(vals[l.id]))
          return (
            <li key={l.id} className="rounded-2xl bg-white/[0.045] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold">
                  {l.label}
                  <span className="fb-mono ml-2 text-[10.5px] font-normal text-white/45">
                    MacKay UK: {typeof l.uk === "number" ? `${l.uk}` : l.uk}
                  </span>
                </span>
                <span className="fb-mono text-[15px]" style={{ color }}>
                  {fmt(v)} <span className="text-[11px] text-white/55">kWh/d</span>
                </span>
              </div>
              <p className="fb-mono mt-0.5 text-[11px] text-white/55">= {l.formula}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                {l.params.map((p) => {
                  const id = `${l.id}-${p.key}`
                  return (
                    <label key={p.key} htmlFor={id} className="flex items-center gap-1.5 text-[11.5px] text-white/70">
                      {p.label}
                      <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        step={p.step ?? 1}
                        min={0}
                        value={vals[l.id][p.key]}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          if (!Number.isFinite(n)) return
                          setVals({ ...vals, [l.id]: { ...vals[l.id], [p.key]: n } })
                        }}
                        className="fb-mono w-[72px] rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-right text-[12px] text-white outline-none focus:border-[#C2F84F]"
                      />
                      <span className="text-white/45">{p.unit}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-white/55">{l.note}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BalanceSheet(props: {
  use: Values
  make: Values
  setUse: (v: Values) => void
  setMake: (v: Values) => void
  useT: number
  makeT: number
  eskom: number
  onClose: () => void
}) {
  const { onClose } = props
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      prev?.focus()
    }
  }, [onClose])

  const ratio = props.makeT / props.useT
  const land = landUsed(PRODUCTION, props.make)
  const seaKm2 = (props.make.offshore?.km2 ?? 0) + (props.make.deepoffshore?.km2 ?? 0)
  // kWh/person/day ÷ 24 h = kW per person; × population = national average power
  const makeGW = ((props.makeT / 24) * SA.population) / 1e6
  const gridGW = ((props.eskom / 24) * SA.population) / 1e6
  return createPortal(
    <div className="fb fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="no-scrollbar max-h-full w-full max-w-[1040px] overflow-y-auto rounded-[28px] border border-white/12 bg-[#0d0d10] p-5 outline-none sm:p-7"
        style={{ animation: "fbpop .2s ease-out" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="fb-cap">MacKay method · South Africa</p>
            <h2 id={titleId} className="mt-1 text-[24px] font-bold tracking-[-0.02em]">
              Back-of-the-envelope balance, per person per day
            </h2>
            <p className="mt-1 max-w-[640px] text-[13px] leading-snug text-white/65">
              Back-of-the-envelope estimates, after David MacKay's <em>Sustainable Energy – without the hot air</em> (2008). Every number is an
              assumption you can change. None of this uses Eskom data; the grid figure is shown only for comparison.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                props.setUse(defaults(CONSUMPTION))
                props.setMake(defaults(PRODUCTION))
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[12.5px] font-semibold hover:bg-white/15"
            >
              <RotateCcw className="size-4" aria-hidden /> Reset
            </button>
            <button type="button" onClick={onClose} aria-label="Close balance sheet" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/15">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.045] p-4 text-center" aria-live="polite">
          <div>
            <div className="fb-cap">Average consumption</div>
            <div className="fb-big mt-1 text-[34px]" style={{ color: USE }}>
              {fmt(props.useT)}
            </div>
          </div>
          <div>
            <div className="fb-cap">Optimistic generation</div>
            <div className="fb-big mt-1 text-[34px]" style={{ color: "#C2F84F" }}>
              {fmt(props.makeT)}
            </div>
          </div>
          <div>
            <div className="fb-cap">Balance</div>
            <div className="fb-big mt-1 text-[34px]">{ratio >= 1 ? `${ratio.toFixed(1)}×` : `${Math.round(ratio * 100)}%`}</div>
            <div className="text-[11px] text-white/55">{ratio >= 1 ? "of use, if built" : "of use covered"}</div>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 text-[12px] leading-snug text-white/60">
          <p>
            <span className="text-white/85">Compare MacKay's Britain:</span> {MACKAY_UK.use} used vs {MACKAY_UK.make} possible, so red beat green. South
            Africa has about five times Britain's land per person and twice the sunshine, so its renewable potential per person is far larger.
          </p>
          <p>
            <span className="text-white/85">What “optimistic generation” takes:</span> building on {land.toFixed(1)}% of South Africa (≈{" "}
            {Math.round((SA.landKm2 * land) / 100).toLocaleString("en-ZA")} km²; KwaZulu-Natal is 94 361 km²) plus {seaKm2.toLocaleString("en-ZA")} km² of
            sea. That would average about {Math.round(makeGW)} GW, roughly {Math.round(makeGW / gridGW)}× today's whole Eskom grid (≈{Math.round(gridGW)} GW).
          </p>
          <p>
            <span className="text-white/85">For scale:</span> Eskom grid electricity is about {props.eskom.toFixed(1)} kWh per person per day. That's
            electricity only, averaged over all 63 million people; this sheet counts all energy (petrol, jet fuel, food, heat, things) for a typical car
            owner, which most South Africans are not.
          </p>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Column title="Average consumption" color={USE} lines={CONSUMPTION} vals={props.use} setVals={props.setUse} total={props.useT} />
          <Column title="Optimistic generation (renewables)" color="#C2F84F" lines={PRODUCTION} vals={props.make} setVals={props.setMake} total={props.makeT} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
