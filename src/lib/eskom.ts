/**
 * Eskom Data Portal → dashboard model.
 * public/data/eskom.json is written by scripts/fetch-eskom.mjs (run on a
 * schedule by the GitHub Action). Times are SAST and kept as naive strings.
 */

export type SupplyRow = {
  t: string
  thermal: number | null
  nuclear: number | null
  imports: number | null
  eskomOcgt: number | null
  eskomGas: number | null
  ippOcgt: number | null
  hydro: number | null
  pumpedGen: number | null
  pumping: number | null
  ios: number | null
  ils: number | null
  mlr: number | null
  wind: number | null
  pv: number | null
  csp: number | null
  otherRe: number | null
}
export type DemandRow = { t: string; demand: number | null; forecast: number | null; residual: number | null; residualForecast: number | null }
export type OutageRow = { t: string; unplanned: number | null }
export type CapacityRow = { t: string; available: number | null; availableInclRe: number | null; demand: number | null }

type Dataset<R> = { source: string; uploaded: string; rows: R[] }
export type EskomFile = {
  generatedAt: string
  portal: string
  datasets: {
    supply?: Dataset<SupplyRow>
    demand?: Dataset<DemandRow>
    outages?: Dataset<OutageRow>
    capacity?: Dataset<CapacityRow>
  }
}

/** ASSUMPTION — marginal cost of diesel-fired OCGT energy, R/kWh. Edit to taste. */
export const PEAKER_COST_R_PER_KWH = 6
/** Stats SA mid-year population estimate, July 2025 (P0302). */
export const POPULATION = 63_100_000

/**
 * Large-scale plant operating in South Africa at the end of March 2026, MW.
 * GreenCape, National Renewable Energy Market Intelligence Report 2026, Figure 1
 * (from NTCSA's Generation Customer Connections dashboard).
 */
export const INSTALLED_MW = { wind: 4587, solarPv: 3767 }
export const INSTALLED_SOURCE = "GreenCape, National Renewable Energy Market Intelligence Report 2026, Figure 1 (operating plant, March 2026)"

/** Evening peak window used for load-shift maths (hour-beginning, inclusive). */
export const PEAK_HOURS = [17, 18, 19, 20]
/** Midday solar window loads are shifted into. */
export const SOLAR_HOURS = [10, 11, 12, 13, 14]

export const MIX_SERIES = [
  { key: "coal", label: "Coal", color: "var(--series-1)" },
  { key: "nuclear", label: "Nuclear", color: "var(--series-2)" },
  { key: "hydro", label: "Hydro, storage & imports", color: "var(--series-3)" },
  { key: "renewables", label: "Wind & solar", color: "var(--series-4)" },
  { key: "peakers", label: "Diesel & gas peakers", color: "var(--series-5)" },
] as const
export type MixKey = (typeof MIX_SERIES)[number]["key"]

const v = (x: number | null | undefined) => (x == null ? 0 : x)
const pos = (x: number | null | undefined) => Math.max(0, v(x))
export const hourOf = (t: string) => Number(t.slice(11, 13))

export function parseT(t: string) {
  const [d, h] = t.split(" ")
  const [y, m, day] = d.split("-").map(Number)
  const [hh, mm] = h.split(":").map(Number)
  return new Date(y, m - 1, day, hh, mm)
}

const dayFmt = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short" })
const timeFmt = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
export const fmtDay = (t: string) => dayFmt.format(parseT(t))
export const fmtTime = (t: string) => timeFmt.format(parseT(t))
export const fmtMW = (mw: number) => `${Math.round(mw).toLocaleString("en-ZA")} MW`
export const fmtGW = (mw: number, d = 1) => `${(mw / 1000).toFixed(d)} GW`
export const fmtGWh = (mwh: number, d = 1) => `${(mwh / 1000).toFixed(d)} GWh`
export const fmtRand = (r: number) =>
  r >= 1e9 ? `R${(r / 1e9).toFixed(2)} bn` : r >= 1e6 ? `R${(r / 1e6).toFixed(0)} m` : `R${Math.round(r).toLocaleString("en-ZA")}`

export type MixPoint = { t: string } & Record<MixKey, number>

export function buildModel(file: EskomFile) {
  const supply = file.datasets.supply?.rows ?? []
  const demandAll = file.datasets.demand?.rows ?? []
  const outages = (file.datasets.outages?.rows ?? []).filter((r) => r.unplanned != null)

  // ── supply mix ────────────────────────────────────────────────
  const mix: MixPoint[] = supply.map((r) => ({
    t: r.t,
    coal: pos(r.thermal),
    nuclear: pos(r.nuclear),
    hydro: pos(r.hydro) + pos(r.pumpedGen) + pos(r.imports),
    renewables: pos(r.wind) + pos(r.pv) + pos(r.csp) + pos(r.otherRe),
    peakers: pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt),
  }))
  const energy = Object.fromEntries(MIX_SERIES.map((s) => [s.key, mix.reduce((a, p) => a + p[s.key], 0)])) as Record<MixKey, number>
  const totalEnergy = Object.values(energy).reduce((a, b) => a + b, 0)
  const reShare = totalEnergy ? energy.renewables / totalEnergy : 0
  const days = supply.length / 24
  const peakerByHour = Array(24).fill(0)
  supply.forEach((r) => (peakerByHour[hourOf(r.t)] += pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt)))
  const peakerHours = supply.filter((r) => pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt) > 50).length
  const pumpedOut = supply.reduce((a, r) => a + pos(r.pumpedGen), 0)
  const pumpedIn = supply.reduce((a, r) => a + Math.abs(Math.min(0, v(r.pumping))), 0)
  const loadReduction = supply.reduce((a, r) => a + pos(r.mlr) + pos(r.ils), 0)

  // ── demand ────────────────────────────────────────────────────
  const actual = demandAll.filter((r) => r.demand != null)
  const forecast = demandAll.filter((r) => r.forecast != null && r.demand == null)
  const latest = actual.at(-1)
  const peak = actual.reduce<DemandRow | undefined>((m, r) => (!m || v(r.demand) > v(m.demand) ? r : m), undefined)
  const fPeak = forecast.reduce<DemandRow | undefined>((m, r) => (!m || v(r.forecast) > v(m.forecast) ? r : m), undefined)
  const demandSeries = demandAll.map((r) => ({ t: r.t, actual: r.demand, forecast: r.forecast }))
  // stitch the forecast line onto the last actual point so the two read as one story
  if (latest) {
    const i = demandSeries.findIndex((p) => p.t === latest.t)
    if (i >= 0) demandSeries[i] = { ...demandSeries[i], forecast: latest.demand }
  }

  // ── typical day: average demand and PV by hour ───────────────
  const dSum = Array(24).fill(0)
  const dCnt = Array(24).fill(0)
  actual.forEach((r) => {
    dSum[hourOf(r.t)] += v(r.demand)
    dCnt[hourOf(r.t)]++
  })
  const pvSum = Array(24).fill(0)
  const pvCnt = Array(24).fill(0)
  supply.forEach((r) => {
    pvSum[hourOf(r.t)] += pos(r.pv) + pos(r.csp)
    pvCnt[hourOf(r.t)]++
  })
  const profile = dSum.map((s, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    demand: dCnt[h] ? s / dCnt[h] : 0,
    solar: pvCnt[h] ? pvSum[h] / pvCnt[h] : 0,
  }))
  // ── wind & solar: hourly shape, peaks, capacity factors ───────
  const wSum = Array(24).fill(0)
  supply.forEach((r) => (wSum[hourOf(r.t)] += pos(r.wind)))
  const reProfile = profile.map((p, h) => ({ hour: h, label: p.label, wind: pvCnt[h] ? wSum[h] / pvCnt[h] : 0, solar: p.solar }))
  const windRows = supply.map((r) => ({ t: r.t, v: pos(r.wind) }))
  const solarRows = supply.map((r) => ({ t: r.t, v: pos(r.pv) + pos(r.csp) }))
  const maxOf = (rows: { t: string; v: number }[]) => rows.reduce<{ t: string; v: number } | undefined>((m, r) => (!m || r.v > m.v ? r : m), undefined)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const windAvg = avg(windRows.map((r) => r.v))
  const pvAvg = avg(supply.map((r) => pos(r.pv)))
  const wind = {
    latest: windRows.at(-1),
    peak: maxOf(windRows),
    avg: windAvg,
    cf: windAvg / INSTALLED_MW.wind,
    byDay: [...new Set(supply.map((r) => r.t.slice(0, 10)))].map((d) => {
      const day = windRows.filter((r) => r.t.startsWith(d))
      return { date: d, cf: avg(day.map((r) => r.v)) / INSTALLED_MW.wind }
    }),
  }
  const solar = { latest: solarRows.at(-1), peak: maxOf(solarRows), cfPv: pvAvg / INSTALLED_MW.solarPv }
  const windBest = reProfile.reduce((m, p) => (p.wind > m.wind ? p : m), reProfile[0])
  const solarBest = reProfile.reduce((m, p) => (p.solar > m.solar ? p : m), reProfile[0])

  const peakHour = profile.reduce((m, p) => (p.demand > m.demand ? p : m), profile[0])
  const middayTrough = Math.min(...profile.filter((p) => SOLAR_HOURS.includes(p.hour)).map((p) => p.demand))

  // ── outages ───────────────────────────────────────────────────
  const outageLatest = outages.at(-1)
  const outageAvg = outages.length ? outages.reduce((a, r) => a + v(r.unplanned), 0) / outages.length : 0
  const outageWeekAgo = outages.length > 168 ? outages[outages.length - 169] : undefined

  // capacity file on the portal is not always maintained; only use it when recent
  const cap = file.datasets.capacity?.rows ?? []
  const capLast = cap.at(-1)
  const capFresh = !!(capLast && supply.length && parseT(supply.at(-1)!.t).getTime() - parseT(capLast.t).getTime() < 14 * 864e5)

  // ── per-day rollups for the bento cards ───────────────────────
  const byDay = new Map<string, { date: string; peakerMWh: number; peakerHours: number }>()
  supply.forEach((r) => {
    const date = r.t.slice(0, 10)
    const d = byDay.get(date) ?? { date, peakerMWh: 0, peakerHours: 0 }
    const pk = pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt)
    d.peakerMWh += pk
    if (pk > 50) d.peakerHours++
    byDay.set(date, d)
  })
  const peakerDays = [...byDay.values()]
  const fByDay = new Map<string, DemandRow>()
  forecast.forEach((r) => {
    const date = r.t.slice(0, 10)
    const cur = fByDay.get(date)
    if (!cur || v(r.forecast) > v(cur.forecast)) fByDay.set(date, r)
  })
  const forecastPeaks = [...fByDay.values()].sort((a, b) => (a.t < b.t ? -1 : 1)).slice(0, 3)
  const reSplit = {
    wind: supply.reduce((a, r) => a + pos(r.wind), 0),
    solar: supply.reduce((a, r) => a + pos(r.pv) + pos(r.csp), 0),
    other: supply.reduce((a, r) => a + pos(r.otherRe), 0),
  }
  const outageMax = outages.length ? Math.max(...outages.map((r) => v(r.unplanned))) : 0
  const demandWeekAgo = actual.length > 168 ? actual[actual.length - 169] : actual[0]

  // per person, per day (kWh): energy over the window ÷ days ÷ population
  const perDay = (mwh: number, d: number) => (d ? (mwh * 1000) / d / POPULATION : 0)
  const usedPerPerson = perDay(actual.reduce((a, r) => a + v(r.demand), 0), actual.length / 24)

  return {
    wind,
    solar,
    reProfile,
    windBest,
    solarBest,
    usedPerPerson,
    peakerDays,
    forecastPeaks,
    reSplit,
    outageMax,
    demandWeekAgo,
    generatedAt: file.generatedAt,
    portal: file.portal,
    supplyRange: supply.length ? { from: supply[0].t, to: supply.at(-1)!.t } : null,
    days,
    mix,
    energy,
    totalEnergy,
    reShare,
    peakerEnergy: energy.peakers,
    peakerHours,
    peakerByHour,
    pumpedOut,
    pumpedIn,
    loadReduction,
    latest,
    peak,
    fPeak,
    demandSeries,
    recentDemand: actual.slice(-48).map((r) => ({ t: r.t, v: v(r.demand) })),
    profile,
    peakHour,
    middayTrough,
    outages: outages.map((r) => ({ t: r.t, v: v(r.unplanned) })),
    outageLatest,
    outageAvg,
    outageWeekAgo,
    capacity: capFresh ? capLast : undefined,
    supply,
  }
}
export type GridModel = ReturnType<typeof buildModel>

/** What-if: shift `mw` of evening-peak demand into the solar window. */
export function loadShift(m: GridModel, mw: number) {
  let avoided = 0
  for (const r of m.supply) {
    if (!PEAK_HOURS.includes(hourOf(r.t))) continue
    const peakers = pos(r.eskomOcgt) + pos(r.eskomGas) + pos(r.ippOcgt)
    avoided += Math.min(peakers, mw)
  }
  const perWeek = m.days ? (avoided / m.days) * 7 : 0
  return {
    avoidedMWhPerWeek: perWeek,
    randPerWeek: perWeek * 1000 * PEAKER_COST_R_PER_KWH,
    newPeak: (m.peakHour?.demand ?? 0) - mw,
    peakCut: m.peakHour?.demand ? mw / m.peakHour.demand : 0,
  }
}

export type Recommendation = { id: string; priority: "High" | "Medium" | "Info"; title: string; metric: string; short: string; body: string; icon: "shift" | "flame" | "wrench" | "battery" | "sun" }

export function recommendations(m: GridModel): Recommendation[] {
  const recs: Recommendation[] = []
  const ramp = m.peakHour.demand - m.middayTrough
  recs.push({
    id: "shift",
    priority: ramp > 3000 ? "High" : "Medium",
    icon: "shift",
    title: "Flatten the evening peak",
    metric: `+${fmtGW(ramp)} at ${m.peakHour.label}`,
    short: "Move water heating & pumping into 10:00–15:00",
    body: `Average demand peaks at ${m.peakHour.label}, ${fmtGW(ramp)} above the midday trough, just as solar output fades. Water heating, pumping and batch processes are the easiest loads to move into 10:00–15:00.`,
  })
  if (m.peakerEnergy > 0) {
    const topHours = m.peakerByHour
      .map((e: number, h: number) => ({ e, h }))
      .sort((a: { e: number }, b: { e: number }) => b.e - a.e)
      .slice(0, 3)
      .map((x: { h: number }) => `${String(x.h).padStart(2, "0")}h`)
      .sort()
    recs.push({
      id: "peakers",
      priority: m.peakerEnergy > 20000 ? "High" : "Medium",
      icon: "flame",
      title: "Cut diesel peaker burn",
      metric: `${fmtGWh(m.peakerEnergy)} in ${Math.round(m.days)} days`,
      short: `${m.peakerHours} h of OCGT ≈ ${fmtRand(m.peakerEnergy * 1000 * PEAKER_COST_R_PER_KWH)}*`,
      body: `OCGT and gas units ran for ${m.peakerHours} hours, mostly around ${topHours.join(", ")}. At about R${PEAKER_COST_R_PER_KWH}/kWh (assumed) that's roughly ${fmtRand(m.peakerEnergy * 1000 * PEAKER_COST_R_PER_KWH)}. Storage and demand response are cheaper firm capacity.`,
    })
  }
  if (m.outageAvg > 0) {
    const gwWeek = 168 // GWh from 1 GW over a week
    const ratio = m.peakerEnergy ? (gwWeek * 1000) / ((m.peakerEnergy / m.days) * 7) : 0
    recs.push({
      id: "outages",
      priority: m.outageAvg > 12000 ? "High" : "Medium",
      icon: "wrench",
      title: "Recover unplanned losses",
      metric: `${fmtGW(m.outageAvg)} offline (avg)`,
      short: "1 GW recovered ≈ 168 GWh a week",
      body: `Unplanned and other outages took about ${fmtGW(m.outageAvg)} offline on average. Recovering just 1 GW adds ~168 GWh a week${ratio ? `, about ${ratio.toFixed(1)}× this week's peaker output` : ""}.`,
    })
  }
  if (m.pumpedIn > 0) {
    const eff = m.pumpedOut / m.pumpedIn
    recs.push({
      id: "storage",
      priority: "Info",
      icon: "battery",
      title: "Pumped storage round trip",
      metric: `${Math.round(eff * 100)}% returned`,
      short: "Pump on midday solar, not night-time coal",
      body: `Pumped storage returned ${fmtGWh(m.pumpedOut)} for ${fmtGWh(m.pumpedIn)} pumped. Pumping at midday on surplus solar, instead of at night on coal, raises its renewable value.`,
    })
  }
  return recs
}

/**
 * Eskom Megaflex 2026/27 active energy charges, c/kWh excl. VAT
 * (Schedule of Standard Prices from 1 April 2026, Table 1: transmission zone
 * > 900 km i.e. Cape Town, supply ≥ 500 V & < 66 kV). Only the energy charge
 * changes with time of day; demand and fixed charges are left out.
 */
export const MEGAFLEX = {
  source: "Eskom Schedule of Standard Prices 2026/27, Megaflex, Cape Town zone (> 900 km), 500 V–66 kV",
  high: { peak: 741.81, standard: 185.46, offpeak: 123.64 }, // June–August
  low: { peak: 307.86, standard: 173.08, offpeak: 123.64 }, // September–May
  /** weekday peak hours (hour-beginning); 10:00–15:00 is standard in both seasons */
  peakHours: { high: [6, 7, 17, 18, 19], low: [7, 8, 18, 19, 20] },
  weekdays: { high: 65.7, low: 195 }, // ≈ weekdays per season (92 and 273 days × 5/7)
}
export type Season = "high" | "low"
export const seasonOf = (d = new Date()) => (d.getMonth() >= 5 && d.getMonth() <= 7 ? "high" : "low") as Season

/**
 * Customer bill saving from moving `mw` out of each evening hour (17:00–21:00)
 * into the 10:00–15:00 window, for customers on Megaflex. Per weekday, each
 * shifted kWh saves (that hour's rate − the standard rate it moves into).
 */
export function billSaving(mw: number) {
  const perSeason = (s: Season) => {
    const t = MEGAFLEX[s]
    const rate = (h: number) => (MEGAFLEX.peakHours[s].includes(h) ? t.peak : t.standard)
    // rands per weekday: kWh shifted in each hour × (c/kWh difference) ÷ 100
    const perWeekday = PEAK_HOURS.reduce((a, h) => a + (mw * 1000 * (rate(h) - t.standard)) / 100, 0)
    const kWhPerWeekday = mw * 1000 * PEAK_HOURS.length
    const peakHoursHit = PEAK_HOURS.filter((h) => MEGAFLEX.peakHours[s].includes(h)).length
    return { perWeekday, perWeek: perWeekday * 5, perKWh: kWhPerWeekday ? perWeekday / kWhPerWeekday : 0, peakHoursHit, spread: (t.peak - t.standard) / 100 }
  }
  const high = perSeason("high")
  const low = perSeason("low")
  return { high, low, perYear: high.perWeekday * MEGAFLEX.weekdays.high + low.perWeekday * MEGAFLEX.weekdays.low }
}
