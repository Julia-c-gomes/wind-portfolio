import { motion, useScroll, useTransform } from "framer-motion"

/**
 * Flat vector turbine: the poster shown while the 3D scene loads, and the
 * fallback on devices without WebGL. Its blades also turn with the scroll.
 */
export function TurbineSvg({ className, still = false }: { className?: string; still?: boolean }) {
  const { scrollY } = useScroll()
  const rotate = useTransform(scrollY, (y) => (still ? 0 : (y * 0.26) % 360))

  return (
    <svg viewBox="0 0 600 900" className={className} aria-hidden>
      <defs>
        <linearGradient id="tw-tower" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d1e6" />
        </linearGradient>
        <linearGradient id="tw-blade" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7ddee" />
        </linearGradient>
      </defs>
      {/* distant turbine */}
      <g opacity={0.35} transform="translate(120 520) scale(.45)">
        <path d="M-8 0 L8 0 L16 760 L-16 760 Z" fill="#c4cbe0" />
        <g>
          {[0, 120, 240].map((a) => (
            <path key={a} transform={`rotate(${a + 20})`} d="M-9 -14 C-20 -80 -16 -180 -4 -262 L4 -262 C22 -170 30 -80 14 -14 Z" fill="#c4cbe0" />
          ))}
        </g>
      </g>
      {/* tower */}
      <path d="M292 318 L308 318 L326 900 L274 900 Z" fill="url(#tw-tower)" />
      {/* nacelle */}
      <rect x="262" y="290" width="96" height="38" rx="19" fill="#f6f8fd" />
      <rect x="334" y="290" width="8" height="38" fill="#3a6cf4" />
      <g transform="translate(300 309)">
        <motion.g style={{ rotate }}>
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M-11 -16 C-26 -90 -22 -200 -6 -292 L6 -292 C30 -190 38 -90 16 -16 Z" fill="url(#tw-blade)" />
              <path d="M-8.2 -256 C-7.2 -272 -6.6 -282 -6 -292 L6 -292 C8.5 -280 10.4 -268 12.2 -256 Z" fill="#ff6a3d" />
            </g>
          ))}
        </motion.g>
        <circle r="20" fill="#ffffff" />
        <circle r="20" fill="none" stroke="#c9d1e6" strokeWidth="2" />
      </g>
    </svg>
  )
}
