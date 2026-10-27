/**
 * A David MacKay-style energy balance sheet for South Africa
 * ("Sustainable Energy – without the hot air", 2008), in kWh per person per day.
 *
 * These are deliberately back-of-the-envelope estimates built from stated
 * assumptions, not Eskom data. Every number below can be edited in the UI.
 *
 *   Consumption: all of MacKay's categories, for a typical car-owning South
 *                African (MacKay's "typical moderately affluent person").
 *   Production:  what South Africa's renewable resources could sustainably
 *                deliver if we built on a stated share of land, sea or coast.
 *
 * Each line also carries MacKay's own figure for Britain (`uk`) for comparison.
 */

export const SA = {
  population: 63_100_000, // Stats SA mid-year estimate, July 2025
  landKm2: 1_219_090, // mainland area
}
/** Land area per person, m² (≈ 19 300 m²) */
export const LAND_PER_PERSON = (SA.landKm2 * 1e6) / SA.population

/** Average power in watts per person → kWh per person per day */
const wToKwhDay = (w: number) => (w * 24) / 1000
/** Total national average power (W) → kWh per person per day */
const nationalW = (w: number) => wToKwhDay(w / SA.population)

export type Param = { key: string; label: string; unit: string; value: number; step?: number }
export type Line = {
  id: string
  label: string
  /** MacKay's figure for Britain (kWh/d); a string where he grouped it under another line */
  uk: number | string
  params: Param[]
  /** kWh per person per day */
  calc: (p: Record<string, number>) => number
  /** human-readable formula, shown in the sheet */
  formula: string
  note: string
  /** share of South Africa's land this line builds on, % (land-based production only) */
  landShare?: (p: Record<string, number>) => number
}

export const CONSUMPTION: Line[] = [
  {
    id: "car",
    label: "Car",
    uk: 40,
    params: [
      { key: "km", label: "distance", unit: "km/day", value: 50 },
      { key: "kmPerL", label: "economy", unit: "km/L", value: 12 },
      { key: "kWhPerL", label: "petrol energy", unit: "kWh/L", value: 9.5, step: 0.1 },
    ],
    calc: (p) => (p.km / p.kmPerL) * p.kWhPerL,
    formula: "distance per day ÷ distance per litre × energy per litre",
    note: "MacKay's own method. Petrol holds about 9.5 kWh per litre.",
  },
  {
    id: "planes",
    label: "Planes",
    uk: 30,
    params: [
      { key: "trips", label: "return trips", unit: "per year", value: 2, step: 0.5 },
      { key: "km", label: "one-way distance", unit: "km", value: 1270, step: 10 },
      { key: "kWhPerPkm", label: "energy", unit: "kWh/passenger-km", value: 0.5, step: 0.05 },
    ],
    calc: (p) => (p.trips * 2 * p.km * p.kWhPerPkm) / 365,
    formula: "trips × 2 × distance × energy per passenger-km ÷ 365",
    note: "Default is two Johannesburg–Cape Town returns a year. MacKay's 30 is one long-haul return a year; a Cape Town–London return (≈ 9 700 km each way) adds about 26 kWh/day.",
  },
  {
    id: "heating",
    label: "Heating & cooling",
    uk: 37,
    params: [
      { key: "leak", label: "home leakiness", unit: "W/°C", value: 250, step: 10 },
      { key: "dd", label: "heating degree-days", unit: "°C·days/yr", value: 1000, step: 50 },
      { key: "heated", label: "share actually heated", unit: "%", value: 40, step: 5 },
      { key: "people", label: "household size", unit: "people", value: 3.3, step: 0.1 },
      { key: "cool", label: "air-con, home + work", unit: "kWh/day", value: 0.5, step: 0.1 },
    ],
    calc: (p) => (((p.leak * p.dd * 24) / 1000 / 365) * (p.heated / 100)) / p.people + p.cool,
    formula: "leakiness × degree-days × 24 h ÷ 365 × share heated ÷ household + cooling",
    note: "MacKay's heat-loss method. An uninsulated SA house leaks about 250 W per °C, and Highveld winters give roughly 1 000 heating degree-days. Most SA homes are only partly heated. Britain's 37 also includes hot water and cooking.",
  },
  {
    id: "hotwater",
    label: "Hot water",
    uk: "in heating",
    params: [
      { key: "litres", label: "hot water", unit: "L/day", value: 50 },
      { key: "dT", label: "heated by", unit: "°C", value: 40 },
      { key: "loss", label: "geyser standing loss", unit: "kWh/day", value: 0.7, step: 0.1 },
    ],
    calc: (p) => (p.litres * 4.186 * p.dT) / 3600 + p.loss,
    formula: "litres × 4.186 kJ/(kg·°C) × temperature rise ÷ 3 600 + geyser losses",
    note: "MacKay counts this inside heating. Showers, washing and dishes, heated from about 15 °C to 55 °C. A 150 L geyser loses about 2 kWh/day, shared by about 3 people.",
  },
  {
    id: "light",
    label: "Lighting",
    uk: 4,
    params: [
      { key: "bulbs", label: "bulbs at home", unit: "", value: 10 },
      { key: "watts", label: "LED power", unit: "W", value: 9 },
      { key: "hours", label: "on for", unit: "h/day", value: 6 },
      { key: "people", label: "household size", unit: "people", value: 3.3, step: 0.1 },
      { key: "outside", label: "× work, shops & streets", unit: "×", value: 3, step: 0.5 },
    ],
    calc: (p) => ((p.bulbs * p.watts * p.hours) / 1000 / p.people) * p.outside,
    formula: "bulbs × watts × hours ÷ household size × (home + work + public lighting)",
    note: "MacKay counted lighting at work and on streets too, hence the multiplier. LEDs make this far smaller than his 2008 figure.",
  },
  {
    id: "gadgets",
    label: "Gadgets",
    uk: 5,
    params: [
      { key: "home", label: "fridge, TV, router, chargers", unit: "kWh/day per home", value: 2, step: 0.1 },
      { key: "people", label: "household size", unit: "people", value: 3.3, step: 0.1 },
      { key: "laptopW", label: "laptop", unit: "W", value: 50 },
      { key: "laptopH", label: "used for", unit: "h/day", value: 8 },
    ],
    calc: (p) => p.home / p.people + (p.laptopW * p.laptopH) / 1000,
    formula: "household appliances ÷ household size + laptop watts × hours",
    note: "A fridge-freezer alone is about 1.2 kWh/day. MacKay also adds data centres and networks; they're left out here.",
  },
  {
    id: "food",
    label: "Food & farming",
    uk: 15,
    params: [
      { key: "kcal", label: "food eaten", unit: "kcal/day", value: 2500, step: 50 },
      { key: "mult", label: "× growing, fertiliser, processing, transport", unit: "×", value: 5, step: 0.5 },
    ],
    calc: (p) => ((p.kcal * 4.184) / 3600) * p.mult,
    formula: "kcal × 4.184 kJ/kcal ÷ 3 600 × farming multiplier",
    note: "2 500 kcal is about 2.9 kWh of chemical energy. MacKay's mixed diet (milk, eggs, some meat) comes to roughly 5× that once farming is included.",
  },
  {
    id: "stuff",
    label: "Stuff",
    uk: 48,
    params: [
      { key: "car", label: "making a car", unit: "kWh", value: 76000, step: 1000 },
      { key: "years", label: "car kept for", unit: "years", value: 15 },
      { key: "other", label: "everything else", unit: "kWh/day", value: 30, step: 1 },
    ],
    calc: (p) => p.car / p.years / 365 + p.other,
    formula: "car's embodied energy ÷ years kept ÷ 365 + other goods",
    note: "Energy embodied in what we buy. MacKay puts making a car at about 76 000 kWh. Everything else (packaging, clothes, electronics, a share of building a house) is about 34 kWh/day for a Briton; 30 is assumed here.",
  },
  {
    id: "freight",
    label: "Transporting stuff",
    uk: 12,
    params: [
      { key: "tkm", label: "road freight", unit: "tonne-km/day", value: 11, step: 1 },
      { key: "kWhPerTkm", label: "truck energy", unit: "kWh/tonne-km", value: 0.7, step: 0.1 },
      { key: "ship", label: "shipping imports", unit: "kWh/day", value: 1, step: 0.5 },
    ],
    calc: (p) => p.tkm * p.kWhPerTkm + p.ship,
    formula: "freight per person × energy per tonne-km + share of shipping",
    note: "Most South African freight moves by road. 11 tonne-km per person per day is about 250 billion tonne-km a year nationally (an assumption). Trucks use roughly 0.7 kWh per tonne-km.",
  },
  {
    id: "defence",
    label: "Defence",
    uk: 4,
    params: [
      { key: "ukDaily", label: "MacKay's UK figure", unit: "kWh/day", value: 4 },
      { key: "sa", label: "SA defence spend", unit: "% of GDP", value: 0.7, step: 0.1 },
      { key: "ukShare", label: "UK defence spend", unit: "% of GDP", value: 2.5, step: 0.1 },
    ],
    calc: (p) => p.ukDaily * (p.sa / p.ukShare),
    formula: "MacKay's UK figure × (SA defence share of GDP ÷ UK share)",
    note: "Scaled from Britain by how much of the economy goes to defence. South Africa spends far less.",
  },
]

export const PRODUCTION: Line[] = [
  {
    id: "wind",
    label: "Onshore wind",
    uk: 20,
    params: [
      { key: "share", label: "share of land", unit: "%", value: 5, step: 0.5 },
      { key: "wPerM2", label: "power density", unit: "W/m²", value: 2, step: 0.1 },
    ],
    calc: (p) => wToKwhDay(LAND_PER_PERSON * (p.share / 100) * p.wPerM2),
    landShare: (p) => p.share,
    formula: "land per person × share × power per m² × 24 h",
    note: "MacKay's wind-farm figure is 2 W/m². The windiest land is along the Western, Eastern and Northern Cape coasts.",
  },
  {
    id: "solarfarm",
    label: "Solar farms (PV)",
    uk: 50,
    params: [
      { key: "share", label: "share of land", unit: "%", value: 1, step: 0.5 },
      { key: "wPerM2", label: "power density", unit: "W/m² of land", value: 12, step: 1 },
    ],
    calc: (p) => wToKwhDay(LAND_PER_PERSON * (p.share / 100) * p.wPerM2),
    landShare: (p) => p.share,
    formula: "land per person × share × power per m² × 24 h",
    note: "≈ 5.5 kWh/m²/day of sunshine × 20 % panels × panels covering about a third of the ground ≈ 12 W/m². MacKay used 5 W/m² for cloudy Britain.",
  },
  {
    id: "rooftop",
    label: "Rooftop solar PV",
    uk: 5,
    params: [
      { key: "area", label: "panel area", unit: "m² per person", value: 5, step: 0.5 },
      { key: "eff", label: "efficiency", unit: "%", value: 20 },
      { key: "sun", label: "sunshine", unit: "kWh/m²/day", value: 5.5, step: 0.1 },
    ],
    calc: (p) => p.area * (p.eff / 100) * p.sun,
    formula: "panel area × efficiency × daily sunshine",
    note: "South Africa averages about 5.5 kWh/m²/day, more than twice the UK.",
  },
  {
    id: "solarheat",
    label: "Solar water heating",
    uk: 13,
    params: [
      { key: "area", label: "collector", unit: "m² per person", value: 1, step: 0.5 },
      { key: "eff", label: "efficiency", unit: "%", value: 50, step: 5 },
      { key: "sun", label: "sunshine", unit: "kWh/m²/day", value: 5.5, step: 0.1 },
    ],
    calc: (p) => p.area * (p.eff / 100) * p.sun,
    formula: "collector area × efficiency × daily sunshine",
    note: "Solar geysers capture heat directly at about 50 %. They're only useful up to the hot water you actually need.",
  },
  {
    id: "offshore",
    label: "Offshore wind (shallow)",
    uk: 16,
    params: [
      { key: "km2", label: "shallow sea used", unit: "km²", value: 500, step: 100 },
      { key: "wPerM2", label: "power density", unit: "W/m²", value: 3, step: 0.5 },
    ],
    calc: (p) => nationalW(p.km2 * 1e6 * p.wPerM2),
    formula: "sea area × power per m² ÷ population × 24 h",
    note: "MacKay's offshore figure is 3 W/m². South Africa's continental shelf is narrow, so little shallow sea is available.",
  },
  {
    id: "deepoffshore",
    label: "Offshore wind (deep, floating)",
    uk: 32,
    params: [
      { key: "km2", label: "deep sea used", unit: "km²", value: 1000, step: 100 },
      { key: "wPerM2", label: "power density", unit: "W/m²", value: 3, step: 0.5 },
    ],
    calc: (p) => nationalW(p.km2 * 1e6 * p.wPerM2),
    formula: "sea area × power per m² ÷ population × 24 h",
    note: "The seabed drops away quickly, so most South African offshore wind would need floating turbines. MacKay assumed 3 W/m² for deep offshore too.",
  },
  {
    id: "hydro",
    label: "Hydro",
    uk: 1.5,
    params: [
      { key: "km3", label: "river runoff", unit: "km³/year", value: 49 },
      { key: "head", label: "average drop", unit: "m", value: 100, step: 10 },
      { key: "capture", label: "share captured", unit: "%", value: 50, step: 5 },
    ],
    calc: (p) => nationalW(((p.km3 * 1e9 * 1000 * 9.81 * p.head) / (365 * 24 * 3600)) * (p.capture / 100)),
    formula: "runoff × 1 000 kg/m³ × g × drop ÷ seconds per year × share captured ÷ population",
    note: "All South Africa's rivers carry about 49 km³ a year (DWS). It's a dry country, so hydro is small.",
  },
  {
    id: "wave",
    label: "Wave",
    uk: 4,
    params: [
      { key: "km", label: "coast used", unit: "km", value: 300, step: 50 },
      { key: "kWperM", label: "wave power", unit: "kW/m", value: 30, step: 5 },
      { key: "eff", label: "conversion", unit: "%", value: 25, step: 5 },
    ],
    calc: (p) => nationalW(p.km * 1000 * p.kWperM * 1000 * (p.eff / 100)),
    formula: "coastline × wave power per metre × conversion efficiency ÷ population",
    note: "The south-west coast gets about 25–30 kW/m nearshore and about 40 kW/m offshore (Stellenbosch University).",
  },
  {
    id: "tide",
    label: "Tide",
    uk: 11,
    params: [
      { key: "km2", label: "tidal lagoons", unit: "km²", value: 100, step: 50 },
      { key: "range", label: "tidal range", unit: "m", value: 2, step: 0.1 },
    ],
    calc: (p) => nationalW((1025 * 9.81 * p.km2 * 1e6 * p.range ** 2 * 2) / 2 / 86400),
    formula: "½ × seawater density × g × area × range² per tide × 2 tides a day",
    note: "A tidal range of only about 2 m (Britain has places with 10 m+) makes tide almost worthless here. Power scales with range squared.",
  },
  {
    id: "geothermal",
    label: "Geothermal",
    uk: 1,
    params: [
      { key: "share", label: "share of land", unit: "%", value: 10, step: 1 },
      { key: "flux", label: "heat flow", unit: "W/m²", value: 0.06, step: 0.01 },
      { key: "eff", label: "heat → electricity", unit: "%", value: 10, step: 1 },
    ],
    calc: (p) => wToKwhDay(LAND_PER_PERSON * (p.share / 100) * p.flux * (p.eff / 100)),
    formula: "land per person × share × natural heat flow × conversion",
    note: "Only the slow natural heat flow from the Earth is sustainable. South Africa has no volcanic hot spots. (Wells sit under other land uses, so this isn't counted as land used.)",
  },
  {
    id: "biomass",
    label: "Biomass (energy crops)",
    uk: 24,
    params: [
      { key: "share", label: "share of land", unit: "%", value: 2, step: 0.5 },
      { key: "wPerM2", label: "energy crops", unit: "W/m²", value: 0.2, step: 0.05 },
    ],
    calc: (p) => wToKwhDay(LAND_PER_PERSON * (p.share / 100) * p.wPerM2),
    landShare: (p) => p.share,
    formula: "land per person × share × power per m² × 24 h",
    note: "MacKay uses 0.5 W/m² for energy crops in wet Britain. Dry South Africa grows less, so 0.2 here. His 24 also includes food, wood and waste.",
  },
  {
    id: "waste",
    label: "Waste & landfill gas",
    uk: "in biomass",
    params: [
      { key: "kg", label: "waste", unit: "kg/person/day", value: 1.2, step: 0.1 },
      { key: "kWhPerKg", label: "energy content", unit: "kWh/kg", value: 2.5, step: 0.1 },
      { key: "eff", label: "to electricity", unit: "%", value: 25, step: 5 },
    ],
    calc: (p) => p.kg * p.kWhPerKg * (p.eff / 100),
    formula: "waste per person × energy per kg × conversion",
    note: "Burning or digesting household and commercial waste. MacKay counts this in his biomass total.",
  },
]

/** MacKay's totals for Britain, kWh per person per day (book, Fig. 18.1) */
export const MACKAY_UK = { use: 195, make: 180 }

export type Values = Record<string, Record<string, number>>
export const defaults = (lines: Line[]): Values =>
  Object.fromEntries(lines.map((l) => [l.id, Object.fromEntries(l.params.map((p) => [p.key, p.value]))]))

export const evaluate = (lines: Line[], vals: Values) =>
  lines.map((l) => ({ id: l.id, label: l.label, kwh: Math.max(0, l.calc(vals[l.id])) }))

/** Share of South Africa's land built on by the land-based lines, % */
export const landUsed = (lines: Line[], vals: Values) => lines.reduce((a, l) => a + (l.landShare ? l.landShare(vals[l.id]) : 0), 0)
