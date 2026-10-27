import { INSTALLED_MW, INSTALLED_SOURCE, MEGAFLEX, PEAKER_COST_R_PER_KWH } from "@/lib/eskom"

/** What each dashboard card shows: where the data comes from, how it's computed, why it matters. */
export type CardInfo = { source: string; how: string; why: string }

const BUILD_UP = "Eskom Data Portal · “Station Build Up” (hourly generation by source, MW)."
const DEMAND = "Eskom Data Portal · “System hourly actual and forecasted demand”."

export const INFO = {
  windNow: {
    source: `${BUILD_UP} Series: Wind. Fleet size: ${INSTALLED_SOURCE}.`,
    how: `Wind generation in the latest published hour (hour-beginning, SAST), and that as a share of the ${INSTALLED_MW.wind.toLocaleString("en-ZA")} MW of large-scale wind operating in March 2026.`,
    why: "Wind is South Africa's largest renewable source by installed capacity, and it often blows hardest in the evening and at night, when solar is off.",
  },
  solarPeak: {
    source: `${BUILD_UP} Series: PV and CSP.`,
    how: "The highest single hour of grid-scale solar (photovoltaic plus concentrated solar power) over the data window.",
    why: "Solar sets the midday shape of the grid. Rooftop solar is behind the meter and invisible here, so real solar output is higher.",
  },
  capacity: {
    source: `${BUILD_UP} Installed capacity: ${INSTALLED_SOURCE}.`,
    how: `Capacity factor = average output ÷ installed capacity. Wind: average hourly wind MW ÷ ${INSTALLED_MW.wind.toLocaleString("en-ZA")} MW. PV: average hourly PV MW ÷ ${INSTALLED_MW.solarPv.toLocaleString("en-ZA")} MW. Some private (wheeled) plants may not appear in Eskom's figures, so these read slightly low.`,
    why: "Capacity factor is how hard a fleet actually works. Over a full year South African wind farms work at roughly a third of capacity and utility PV at about a quarter; a single week swings with the weather.",
  },
  complement: {
    source: BUILD_UP,
    how: "For each clock hour, average wind and average solar (PV + CSP) across every day in the data. The strip underneath is the wind capacity factor for each day.",
    why: "The two shapes fill each other's gaps: solar covers the middle of the day, wind often picks up in the evening and overnight. A grid with both needs less storage than one with either alone.",
  },
  peak: {
    source: `${DEMAND} Series: RSA Contracted Demand.`,
    how: "The highest single hourly value in the last 7 days of actual demand. Times are hour-beginning in SAST, so 19:00 means 19:00–20:00.",
    why: "The grid has to be planned and run for its busiest hour, not its average. Peaks drive load-shedding risk and expensive diesel use.",
  },
  outages: {
    source: "Eskom Data Portal · “Hourly UCLF and OCLF trend” (MW).",
    how: "The latest hour of unplanned capability losses (UCLF) plus other losses outside Eskom's control (OCLF), compared with the same hour 7 days earlier. The tick bar shows it as a share of the highest value in the file (about 15 days).",
    why: "Broken-down capacity can't be dispatched, so it has to be replaced by diesel peakers or by cutting demand. It's the main driver of supply shortfalls.",
  },
  forecast: {
    source: `${DEMAND} Series: RSA Contracted Forecast.`,
    how: "For each upcoming day, the highest forecast hour. The next three days are listed.",
    why: "Shows when the grid will be tightest, so flexible users can plan heavy loads around those hours.",
  },
  renew: {
    source: BUILD_UP,
    how: "Wind + solar PV + CSP + other renewables, divided by all energy supplied over the same days. The bar splits renewables into wind, solar (PV + CSP) and other.",
    why: "Tracks how fast the grid is decarbonising. Rooftop solar behind the meter isn't visible to Eskom's system operator, so the true share is somewhat higher.",
  },
  supply: {
    source: BUILD_UP,
    how: "Hourly output stacked from zero: coal on the bottom; then nuclear, hydro, pumped-storage generation, imports and diesel/gas peakers; then wind, solar and other renewables on top. The big number is total supply in the latest hour; the % compares it with the first hour shown.",
    why: "Shows how the mix shifts through each day: solar fills the middle of the day, and peakers appear at the evening peak.",
  },
  demand: {
    source: `${DEMAND} Series: RSA Contracted Demand and Forecast.`,
    how: "Actual hourly demand up to the latest published hour, then Eskom's own forecast (lime) for the days ahead. The pills mark the week's peak, the latest hour and the forecast peak.",
    why: "Comparing what happened with what's coming shows whether the next few days will be tighter or easier than this week.",
  },
  mix: {
    source: BUILD_UP,
    how: "Each group's total energy over the period (MWh, summed hour by hour) divided by all energy supplied. The gauge ticks are coloured in the same proportions.",
    why: "Energy share, rather than installed capacity, shows what actually powered the country.",
  },
  day: {
    source: `${DEMAND} Solar from ${BUILD_UP}`,
    how: "For each clock hour, the average of that hour's actual demand across the last 7 days (every 19:00 value averaged, and so on). The solar window is 10:00–15:00 and the evening peak 17:00–21:00. The dashed line is the same profile after the load-shift slider moves demand from the peak into the solar window.",
    why: "The daily shape reveals the evening ramp as solar fades: the hardest and most expensive hours to supply.",
  },
  optimise: {
    source: `${BUILD_UP} Peaker output: Eskom OCGT + Eskom gas + dispatchable IPP OCGT.`,
    how: `For every evening-peak hour (17:00–21:00) in the data, shifted load can replace peaker output up to what actually ran: min(peaker MW, shifted MW). That is summed, scaled to a 7-day week and costed at R${PEAKER_COST_R_PER_KWH}/kWh (an assumption). Peak cut = shifted MW ÷ average demand in the peak hour. Recommendations are rule-based checks on the same data.`,
    why: "Moving flexible load (water heating, pumping, batch processes) is the cheapest “new capacity”: it avoids diesel without building anything. Simplification: it assumes midday has spare supply and energy moves 1:1.",
  },
  bill: {
    source: `${MEGAFLEX.source}, energy charge excl. VAT. Peak ${MEGAFLEX.high.peak} / standard ${MEGAFLEX.high.standard} c/kWh in June–August; peak ${MEGAFLEX.low.peak} / standard ${MEGAFLEX.low.standard} c/kWh in September–May.`,
    how: "Megaflex charges more for the same kWh at peak times. Weekday peak hours are 17:00–20:00 in winter (June–August) and 18:00–21:00 the rest of the year; 10:00–15:00 is always “standard”. Moving load from 17:00–21:00 into 10:00–15:00 therefore saves (peak rate − standard rate) for three of the four evening hours, and nothing for the fourth (already standard). Worked example: a factory moving 1 MW for those 4 hours saves 1 000 kW × 3 h × (741.81 − 185.46) c ≈ R16 700 per winter weekday (≈ R4.17 per kWh moved), or 1 000 × 3 × (307.86 − 173.08) c ≈ R4 000 per weekday Sep–May (≈ R1.01/kWh). Over a year that's about R1.9 million per MW shifted. The big number scales this to the slider's MW for the current season, weekdays only.",
    why: "This is the business case that makes customers actually move load, or install batteries to do it for them (GreenCape's “arbitrage and peak shaving”). It's separate from the grid-side diesel saving: one is money customers keep, the other is fuel Eskom doesn't burn. Network demand charges and public holidays are ignored here, and only customers on time-of-use tariffs see this saving.",
  },
  balance: {
    source: "Assumptions only, after David MacKay, “Sustainable Energy – without the hot air” (2008). South African inputs: Stats SA population (63.1 m), land area, DWS river runoff (≈49 km³/yr), Stellenbosch wave data (≈25–40 kW/m), average sunshine ≈5.5 kWh/m²/day. The grid marker is the only Eskom figure.",
    how: "All of MacKay's categories, each a simple formula, e.g. car = km per day ÷ km per litre × kWh per litre. Renewables = the share of land, sea or coast you'd build on × a typical power per m² (wind ≈2 W/m², solar farms ≈12 W/m²) ÷ population. Open the balance sheet to see and change every assumption.",
    why: "It turns national energy into a personal scale you can reason about: how much a lifestyle uses, and whether South Africa's sun, wind and water could cover it. “Optimistic generation” assumes we build on the stated areas; it isn't today's output. “Average consumption” is for a typical car owner.",
  },
} satisfies Record<string, CardInfo>
