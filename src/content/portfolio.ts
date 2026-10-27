/**
 * ─────────────────────────────────────────────────────────────
 *  EDIT ME — every word on the portfolio page lives in this file.
 * ─────────────────────────────────────────────────────────────
 * Each `folder` is one card in the stack. Keep them short: on laptops a
 * folder sits pinned on screen and must fit without scrolling.
 */

export const profile = {
  name: "Julia Gomes",
  first: "Julia",
  last: "Gomes",
  role: "Graduate Chemical Engineer",
  location: "Cape Town, South Africa",
  headline: "Climate change is actually",
  headlineAccent: "an energy problem.",
  intro:
    "Chemical engineering graduate focused on process design, optimisation and data analysis, from electrochemistry applications to extracting value from data.",
  email: "jewlcross@gmail.com",
  linkedin: "https://www.linkedin.com/in/julia-c-gomes",
  github: "https://github.com/Julia-c-gomes",
  /** Words that scroll along the strip under the hero */
  ticker: ["Process design", "Renewable energy", "Electrochemistry", "Aspen Plus", "Python", "Green hydrogen", "Carbon capture", "Grid analytics"],
}

export type Stat = { value: string; label: string }
export type Link = { label: string; href: string; kind: "email" | "linkedin" | "github" | "internal" }
/** color: the dot beside this group's label */
export type ChipGroup = { label: string; items: string[]; color: string }

/** Folder colours come from the site palette (see index.css). */
export type FolderTone = "blue" | "cream" | "green" | "orange" | "slate" | "lime"

export type Folder = {
  id: string
  /** Short label for the nav and the folder tab */
  label: string
  tone: FolderTone
  title: string
  body?: string
  bullets?: string[]
  chipGroups?: ChipGroup[]
  stats?: Stat[]
  links?: Link[]
  /** Show the portrait photo (public/portrait.jpg) */
  portrait?: boolean
  /** Show live Eskom wind & solar numbers */
  liveGrid?: boolean
}

export const folders: Folder[] = [
  {
    id: "about",
    label: "About",
    tone: "blue",
    title: "Driven by a challenge",
    body:
      "I averaged 77% in each of the last three years of my degree, with a distinction in Renewable Energy, while working 20 hours a week. As an electrochemistry research assistant at UCT I ran lab experiments and taught myself Python to make sense of the data. Outside, I hold an A & B skydiving licence and love surfing, trail running and free diving.",
    stats: [
      { value: "77%", label: "3 years running" },
      { value: "Distinction", label: "Renewable Energy" },
      { value: "20 h", label: "Worked weekly" },
    ],
    portrait: true,
  },
  {
    id: "education",
    label: "Education",
    tone: "cream",
    title: "BSc Chemical Engineering, UCT",
    body: "University of Cape Town, 2022–2025. Graduated with 77% in final year.",
    bullets: [
      "Dean's Merit List, 2023–2025",
      "Thesis: plasticisers and water-vapour permeability of carrageenan bioplastics",
      "Coursework: Renewable Energy, Chemical Engineering Design, Data Science & System Dynamics",
    ],
  },
  {
    id: "toolkit",
    label: "Toolkit",
    tone: "green",
    title: "Lab bench to code",
    chipGroups: [
      { label: "Code", color: "#3a6cf4", items: ["Python", "Scilab", "JavaScript", "SQL", "LaTeX"] },
      { label: "Tools", color: "#ff6a3d", items: ["Aspen Plus", "Microsoft Office", "VS Code"] },
      { label: "Lab", color: "#131a2c", items: ["Cyclic voltammetry", "Electrochemical setup", "Centrifuge", "Press filter"] },
      { label: "Languages", color: "#f3e7a6", items: ["English", "French", "Afrikaans", "Portuguese"] },
    ],
  },
  {
    id: "hydrogen",
    label: "Hydrogen",
    tone: "orange",
    title: "Green hydrogen plant design",
    body: "Designed a 20 MW PEM electrolysis plant on the West Coast, from flowsheet through to cost model.",
    stats: [
      { value: "R/kg", label: "LCOH modelled" },
      { value: "20 MW", label: "Electrolyser" },
      { value: "Aspen", label: "Simulation" },
    ],
  },
  {
    id: "capture",
    label: "Capture",
    tone: "slate",
    title: "Carbon capture solvent study",
    body:
      "Compared amine solvents for post-combustion CO₂ capture, cutting modelled regeneration energy by optimising stripper conditions.",
    bullets: ["Rate-based absorber model", "Sensitivity & optimisation in Python"],
  },
  {
    id: "grid",
    label: "Grid",
    tone: "lime",
    title: "Renewables grid analytics",
    body:
      "A live dashboard on Eskom's public data: how much of South Africa's power comes from wind and sun, how hard the turbines are working, and where demand could shift to burn less diesel at the evening peak.",
    links: [{ label: "Open the dashboard", href: "/grid", kind: "internal" }],
    liveGrid: true,
  },
]

export const contact = {
  eyebrow: "Contact",
  title: "Let's put some energy in.",
  body: "Open to graduate roles in process, energy and sustainability, in Cape Town or remote.",
  links: [
    { label: "Email me", href: `mailto:${profile.email}`, kind: "email" },
    { label: "LinkedIn", href: profile.linkedin, kind: "linkedin" },
    { label: "GitHub", href: profile.github, kind: "github" },
  ] satisfies Link[],
}

/** Everything the nav can jump to, in page order. */
export const sections = [
  { id: "home", label: "Home" },
  ...folders.map((f) => ({ id: f.id, label: f.label })),
  { id: "contact", label: "Contact" },
]
