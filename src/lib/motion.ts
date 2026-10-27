import { useReducedMotion } from "framer-motion"

// Dev only: add ?motion=full to preview the full animation on a machine with reduced motion on.
const forceFull = import.meta.env.DEV && typeof location !== "undefined" && location.search.includes("motion=full")

/** The visitor's "reduce motion" setting. */
export function useReduced() {
  const reduced = !!useReducedMotion()
  return forceFull ? false : reduced
}
