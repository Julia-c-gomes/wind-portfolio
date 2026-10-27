import { useEffect, useState } from "react"

import { INSTALLED_MW, type EskomFile, type SupplyRow } from "@/lib/eskom"

export { INSTALLED_MW }

let cache: Promise<EskomFile> | null = null

/** One shared download of public/data/eskom.json, reused by every component. */
export function loadGrid(): Promise<EskomFile> {
  cache ??= fetch(`data/eskom.json?v=${Math.floor(Date.now() / 3.6e6)}`).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
  )
  cache.catch(() => (cache = null)) // allow a retry after a failure
  return cache
}

const pos = (x: number | null | undefined) => Math.max(0, x ?? 0)

export type GridSnapshot = {
  t: string
  windMW: number
  solarMW: number
  reShare: number
  /** latest wind output ÷ installed wind */
  windCF: number
}

export function snapshot(file: EskomFile): GridSnapshot | null {
  const rows = file.datasets.supply?.rows ?? []
  const r: SupplyRow | undefined = rows.at(-1)
  if (!r) return null
  const windMW = pos(r.wind)
  const solarMW = pos(r.pv) + pos(r.csp)
  const renew = windMW + solarMW + pos(r.otherRe)
  const total =
    renew + pos(r.thermal) + pos(r.nuclear) + pos(r.hydro) + pos(r.pumpedGen) + pos(r.imports) + pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt)
  return { t: r.t, windMW, solarMW, reShare: total ? renew / total : 0, windCF: windMW / INSTALLED_MW.wind }
}

/** Latest-hour snapshot, fetched after the page has painted. */
export function useGridSnapshot(delayMs = 600) {
  const [snap, setSnap] = useState<GridSnapshot | null>(null)
  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => {
      loadGrid()
        .then((f) => alive && setSnap(snapshot(f)))
        .catch(() => {})
    }, delayMs)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [delayMs])
  return snap
}
