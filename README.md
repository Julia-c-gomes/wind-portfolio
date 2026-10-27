# Wind portfolio

A chemical-engineering portfolio built around a wind turbine, plus a live dashboard of South Africa's wind and solar output from Eskom data.

- **Portfolio (`/#/`)**: a light hero with a 3D wind turbine modelled in code (three.js, no video or model download). Its blades turn as you scroll, and its idle speed follows the latest Eskom wind figure. Engineering call-outs pin to the rotor, nacelle and tower, then the page dims into a navy catalogue of six folders that stack as you scroll. A process-flow pipe (valves and heat-exchanger coils) draws itself down the gutter beside them.
- **Renewables dashboard (`/#/grid`)**: latest wind output, wind and PV capacity factors, the week's solar peak, renewable share, the supply stream, wind vs sun by hour, the average-day load-shift what-if and a MacKay-style energy balance. Capacity factors use operating fleet sizes from GreenCape's *National Renewable Energy Market Intelligence Report 2026* (wind 4 587 MW, PV 3 767 MW, March 2026).

Stack: Vite · React 19 · TypeScript · Tailwind CSS 4 · shadcn structure (`src/components/ui`) · framer-motion · three.js + @react-three/fiber · lucide-react. Dashboard charts are hand-drawn SVG (bento design adapted from Finance Bento by vasnev.art). Folder-tab layout and palette after the 21st.dev folder-tab portfolio template; the scroll-drawn line after Skiper UI's "stroke that follows the scroll".

## Edit your content

Everything you'll want to change is in **`src/content/portfolio.ts`**: name, links, ticker words and every folder. The portrait is `public/portrait.jpg`; the nav avatar is `public/avatar.webp`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
node scripts/fetch-eskom.mjs   # refresh public/data/eskom.json by hand
```

To preview the full animation on a machine with "reduce motion" switched on, open the dev server with `?motion=full` (dev builds only).

## Deploy to GitHub Pages

1. Create a GitHub repo and push this folder to its `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. `.github/workflows/deploy.yml` builds and deploys on every push. It also runs every 6 hours to pull fresh Eskom CSVs, commit `public/data/eskom.json`, and redeploy.

The build uses relative paths and hash routing, so it works at `https://<user>.github.io/<any-repo-name>/` with no configuration.

## How it stays fast on any device

- The text and a vector turbine paint first; three.js (~245 kB gzipped) loads in its own chunk afterwards and crossfades in. Devices without WebGL keep the vector turbine, whose blades also follow the scroll.
- Phones and low-memory devices render at a lower pixel ratio, and the 3D scene stops rendering once the hero is off screen.
- Scroll-linked fades run on the browser's native scroll timeline where supported.
- Fonts load with `display=swap`; grid data downloads after first paint.

## Accessibility

- Respects `prefers-reduced-motion`: the hero becomes a single screen with no pinning or camera moves, the turbine has no idle spin, folders don't shrink, and the process line is drawn in full.
- Folders only pin where a whole folder fits on screen (≥ 1024 px wide and ≥ 700 px tall); elsewhere they flow normally.
- Skip link, visible focus rings, labelled nav with the current section marked, and 44 px touch targets.

## How the Eskom data works

The portal's own download links point at monthly folders that go stale (404). `scripts/fetch-eskom.mjs` asks the portal's WordPress media API for every uploaded copy of each dataset and uses the newest one that parses. If a fetch fails, the previous data is kept, so the site never breaks.

Assumptions are labelled on the page: `PEAKER_COST_R_PER_KWH` (R6/kWh) and `INSTALLED_MW` in `src/lib/eskom.ts`.
