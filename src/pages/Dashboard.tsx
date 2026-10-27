import { ExternalLink, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { DayCard, OptimiseCard, RenewTile, StreamCard, type StreamMode } from "@/components/dashboard/bento-cards"
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { CapacityTile, ComplementCard, SolarTile, WindTile } from "@/components/dashboard/renewables-cards"
import { Seg, Tip, type TipRow, type TipState } from "@/components/ui/finance-bento"
import { buildModel, fmtTime, type EskomFile } from "@/lib/eskom"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const [file, setFile] = useState<EskomFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<StreamMode>("Supply")
  const [shiftMW, setShiftMW] = useState(800)
  const [tip, setTip] = useState<TipState>(null)
  const [entered, setEntered] = useState(false)

  const load = useCallback(() => {
    setError(null)
    fetch(`data/eskom.json?v=${Math.floor(Date.now() / 3.6e6)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setFile)
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  // One screen on desktop; phones and tablets scroll, with the scrollbar hidden.
  useEffect(() => {
    document.documentElement.classList.add("no-scrollbar")
    return () => document.documentElement.classList.remove("no-scrollbar")
  }, [])

  const m = useMemo(() => (file ? buildModel(file) : null), [file])

  // cards rise in once fonts are ready (numbers are measured in Geist)
  useEffect(() => {
    if (!m) return
    let alive = true
    ;(document.fonts?.ready ?? Promise.resolve()).then(() => alive && requestAnimationFrame(() => setEntered(true)))
    return () => {
      alive = false
    }
  }, [m])

  const onTip = useCallback((x: number, y: number, title: string, rows: TipRow[]) => setTip({ x, y, title, rows }), [])
  const onHide = useCallback(() => setTip(null), [])

  if (error) {
    return (
      <main className="fb flex min-h-dvh items-center justify-center px-6">
        <div className="fb-glass max-w-sm rounded-[28px] p-6 text-center">
          <p className="font-semibold">Couldn't load grid data</p>
          <p className="fb-muted mt-1">{error}. The data file may still be building.</p>
          <button onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-semibold text-black">
            <RefreshCw className="size-4" aria-hidden /> Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className={cn("fb fb-fit flex min-h-dvh flex-col px-3 pt-[76px] pb-3 sm:px-5", entered && "in")} aria-busy={!m}>
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col">
        <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="m-0 basis-full text-[24px] sm:basis-auto sm:flex-1 font-bold tracking-[-0.03em] sm:text-[28px]">
            Renewables on the grid
            <span className="mt-1 block text-[13px] font-medium tracking-[-0.01em] text-white/40 sm:mt-0 sm:ml-3 sm:inline sm:text-[15px]">
              {m?.supplyRange ? `Eskom data to ${fmtTime(m.supplyRange.to)}` : "Loading Eskom data…"}
            </span>
          </h1>
          <p className="order-last basis-full text-[12px] leading-snug text-white/45">
            Eskom publishes hourly figures about once a day, usually running 1–2 days behind. This page checks for new data every 6 hours
            {m ? `; it last changed ${new Date(m.generatedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : "."}
          </p>
          <Seg label="Stream view" options={["Supply", "Demand"] as const} value={mode} onChange={setMode} />
          {m && (
            <a href={m.portal} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-[12.5px] font-medium text-white/60 hover:text-white">
              Source <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </header>

        {m ? (
          <div className="fb-grid">
            <WindTile m={m} className="fb-kpi" index={0} />
            <CapacityTile m={m} className="fb-kpi" index={1} />
            <SolarTile m={m} className="fb-kpi" index={2} />
            <RenewTile m={m} className="fb-kpi" index={3} />
            <StreamCard m={m} mode={mode} onTip={onTip} onHide={onHide} className="fb-s8" index={4} />
            <ComplementCard m={m} onTip={onTip} onHide={onHide} className="fb-s4 fb-half" index={5} />
            <DayCard m={m} shiftMW={shiftMW} onTip={onTip} onHide={onHide} className="fb-s4 fb-half" index={6} />
            <OptimiseCard m={m} shiftMW={shiftMW} onShift={setShiftMW} className="fb-s4 fb-half" index={7} />
            <BalanceCard eskomPerPerson={m.usedPerPerson} className="fb-s4 fb-half" index={8} />
          </div>
        ) : (
          <div className="fb-grid" aria-hidden>
            {["fb-kpi", "fb-kpi", "fb-kpi", "fb-kpi", "fb-s8", "fb-s4", "fb-s4", "fb-s4", "fb-s4"].map((c, i) => (
              <div key={i} className={cn(c, "animate-pulse rounded-[28px] bg-white/[0.06]")} />
            ))}
          </div>
        )}
      </div>
      <Tip tip={tip} />
    </main>
  )
}
