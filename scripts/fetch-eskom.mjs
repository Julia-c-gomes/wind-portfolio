#!/usr/bin/env node
/**
 * Pulls the latest public CSVs from the Eskom Data Portal and writes
 * public/data/eskom.json for the dashboard.
 *
 * Why the WordPress media API: the portal's download links point at monthly
 * upload folders that go stale (404). The media API lists every uploaded copy,
 * so we try the newest first and keep the first one that parses.
 *
 * If a dataset can't be fetched (portal down, Cloudflare challenge), the
 * previous value in eskom.json is kept, so the site never breaks.
 *
 * Run: node scripts/fetch-eskom.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = resolve(ROOT, "public/data/eskom.json")
const API = "https://www.eskom.co.za/dataportal/wp-json/wp/v2/media"
const UA = "Mozilla/5.0 (portfolio dashboard; +https://github.com) node-fetch"

/** dataset key → media search term, exact file-name stem, required header, column map */
const DATASETS = {
  supply: {
    search: "Station_Build_Up",
    stem: "Station_Build_Up",
    header: "Date_Time_Hour_Beginning",
    cols: {
      thermal: "Thermal_Generation",
      nuclear: "Nuclear_Generation",
      imports: "International_Imports",
      eskomOcgt: "Eskom_OCGT_Generation",
      eskomGas: "Eskom_Gas_Generation",
      ippOcgt: "Dispatchable_IPP_OCGT",
      hydro: "Hydro_Water_Generation",
      pumpedGen: "Pumped_Water_Generation",
      pumping: "Pumped_Water_SCO_Pumping",
      ios: "IOS_Excl_ILS_and_MLR",
      ils: "ILS_Usage",
      mlr: "Manual_Load_Reduction_MLR",
      wind: "Wind",
      pv: "PV",
      csp: "CSP",
      otherRe: "Other_RE",
    },
  },
  demand: {
    search: "System_hourly_actual_and_forecasted_demand",
    stem: "System_hourly_actual_and_forecasted_demand",
    header: "DateTimeKey",
    cols: {
      demand: "RSA Contracted Demand",
      forecast: "RSA Contracted Forecast",
      residual: "Residual Demand",
      residualForecast: "Residual Forecast",
    },
  },
  outages: {
    search: "Hourly_UCLF_and_OCLF_Trend",
    stem: "Hourly_UCLF_and_OCLF_Trend",
    header: "DateTimeKey",
    cols: { unplanned: "Hourly UCLF+OCLF" },
  },
  capacity: {
    search: "System_hourly_demand_and_available_capacity",
    stem: "System_hourly_demand_and_available_capacity",
    header: "DateTimeKey",
    cols: {
      available: "Available Capacity Incl Non Comm Units",
      availableInclRe: "Available_Capacity_Incl_Non_Comm_Units_Incl_Total_RE",
      demand: "RSA Contracted Demand",
    },
  },
}

async function get(url, accept) {
  // 30 s timeout so a hung Eskom server can't stall the Action
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const head = lines[0].split(",").map((h) => h.trim())
  return { head, rows: lines.slice(1).map((l) => l.split(",")) }
}

const num = (v) => {
  if (v === undefined || v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

async function fetchDataset(key, cfg) {
  const list = await (await get(`${API}?search=${encodeURIComponent(cfg.search)}&per_page=30&orderby=date&order=desc`, "application/json")).json()
  const re = new RegExp(`/${cfg.stem}(-\\d+)?\\.csv$`, "i")
  const candidates = list
    .filter((m) => re.test(m.source_url))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const m of candidates) {
    try {
      const text = await (await get(m.source_url, "text/csv,*/*")).text()
      if (!text.startsWith(cfg.header) && !text.split("\n")[0].includes(cfg.header)) continue
      const { head, rows } = parseCsv(text)
      const idx = Object.fromEntries(Object.entries(cfg.cols).map(([k, col]) => [k, head.indexOf(col)]))
      const missing = Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => k)
      if (missing.length) throw new Error(`missing columns ${missing.join(", ")}`)
      const out = []
      for (const r of rows) {
        const rec = { t: r[0].trim().slice(0, 16) }
        let any = false
        for (const [k, i] of Object.entries(idx)) {
          rec[k] = num(r[i])
          if (rec[k] !== null) any = true
        }
        if (any) out.push(rec)
      }
      console.log(`✓ ${key}: ${out.length} rows from ${m.source_url}`)
      return { source: m.source_url, uploaded: m.date, rows: out }
    } catch (e) {
      console.warn(`  ${key}: skipped ${m.source_url} (${e.message})`)
    }
  }
  throw new Error(`no usable file for ${key}`)
}

const previous = await readFile(OUT, "utf8").then(JSON.parse).catch(() => ({ datasets: {} }))
const datasets = { ...previous.datasets }
let fresh = 0
for (const [key, cfg] of Object.entries(DATASETS)) {
  try {
    datasets[key] = await fetchDataset(key, cfg)
    fresh++
  } catch (e) {
    console.warn(`✗ ${key}: ${e.message}${datasets[key] ? " — keeping previous data" : ""}`)
  }
}

if (!fresh && previous.generatedAt) {
  console.warn("Nothing new fetched; leaving eskom.json unchanged.")
  process.exit(0)
}
// Only rewrite (and so commit) when Eskom's numbers actually changed;
// generatedAt then means "data last changed", not "last checked".
if (previous.generatedAt && JSON.stringify(previous.datasets) === JSON.stringify(datasets)) {
  console.log("Eskom data unchanged since", previous.generatedAt)
  process.exit(0)
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), portal: "https://www.eskom.co.za/dataportal/", datasets }))
console.log(`Wrote ${OUT}`)
