/**
 * The hero wind turbine, modelled in code (no video, no model download).
 * Blade angle follows the page scroll, plus a slow idle spin whose speed
 * follows South Africa's latest wind output. Loaded lazily, so three.js
 * never blocks the first paint.
 */
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber"
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react"
import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Fog,
  LatheGeometry,
  MathUtils,
  MeshStandardMaterial,
  Shape,
  Vector2,
  Vector3,
  type Group,
  type Object3D,
  type PerspectiveCamera,
} from "three"

export type HeroState = {
  /** 0 → 1 through the pinned hero */
  progress: number
  /** idle spin, rad/s */
  omega: number
  /** extra spin from the visitor's pointer, rad/s; decays on its own */
  gust: number
  reduced: boolean
}

const HUB_Y = 4.6
const BLADE_R0 = 0.12
const BLADE_LEN = 2.3
const TIP_FROM = 1.98

const SKY = new Color("#eaedf6")
const DEEP = new Color("#0b0f1c")

/* ───────────── geometry, built once and shared by every turbine ───────────── */

/** Blade chord along its length: narrow root, widest at ~20 %, long taper to the tip. */
function chord(y: number) {
  if (y < 0.5) {
    const t = y / 0.5
    return 0.13 + 0.23 * t * t * (3 - 2 * t)
  }
  return 0.36 - 0.3 * Math.pow((y - 0.5) / (BLADE_LEN - 0.5), 0.8)
}

/** Planform outline between y0 and y1: leading edge at −28 % chord, trailing edge at +72 %. */
function bladeShape(y0: number, y1: number) {
  const n = 28
  const lead: Vector2[] = []
  const trail: Vector2[] = []
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n
    const c = chord(y)
    lead.push(new Vector2(-0.28 * c, y))
    trail.push(new Vector2(0.72 * c, y))
  }
  return new Shape([...lead, ...trail.reverse()])
}

function extrude(shape: Shape) {
  const g = new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 })
  g.translate(0, BLADE_R0, -0.015)
  g.computeVertexNormals()
  return g
}

function useTurbineParts() {
  return useMemo(() => {
    const white = new MeshStandardMaterial({ color: "#f6f8fd", roughness: 0.42, metalness: 0.04 })
    const tip = new MeshStandardMaterial({ color: "#ff6a3d", roughness: 0.5 })
    const accent = new MeshStandardMaterial({ color: "#3a6cf4", roughness: 0.4 })
    // Nose cone: a lathe profile revolved about Y, then turned to face +Z.
    // Points run base → tip (rising y) so the faces point outward, and the
    // base is closed so the cone never shows its hollow inside.
    const nose = new LatheGeometry(
      [
        [0, 0],
        [0.235, 0],
        [0.235, 0.06],
        [0.225, 0.14],
        [0.19, 0.27],
        [0.13, 0.38],
        [0.06, 0.45],
        [0.012, 0.47],
        [0, 0.472],
      ].map(([x, y]) => new Vector2(x, y)),
      48,
    )
    nose.rotateX(Math.PI / 2)
    const nacelle = new CapsuleGeometry(0.2, 0.78, 8, 24)
    nacelle.rotateX(Math.PI / 2)
    return {
      white,
      tip,
      accent,
      tower: new CylinderGeometry(0.09, 0.2, HUB_Y, 40, 1, true),
      nacelle,
      band: new CylinderGeometry(0.212, 0.212, 0.07, 40),
      // short hub drum between nacelle and nose, and a round root on each blade
      hub: new CylinderGeometry(0.235, 0.215, 0.16, 48),
      root: new CylinderGeometry(0.045, 0.07, 0.42, 20),
      nose,
      blade: extrude(bladeShape(0, TIP_FROM)),
      bladeTip: extrude(bladeShape(TIP_FROM, BLADE_LEN)),
    }
  }, [])
}
type Parts = ReturnType<typeof useTurbineParts>

/** One turbine. `rotor` is spun by the caller; anchors mark parts for the HTML labels. */
function Turbine({
  parts,
  rotor,
  anchors,
  ...props
}: {
  parts: Parts
  rotor: RefObject<Group | null>
  anchors?: { rotor: RefObject<Object3D | null>; nacelle: RefObject<Object3D | null>; tower: RefObject<Object3D | null> }
} & ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh geometry={parts.tower} material={parts.white} position={[0, HUB_Y / 2, -0.18]} />
      <object3D ref={anchors?.tower} position={[0.22, HUB_Y * 0.42, -0.18]} />
      <group position={[0, HUB_Y, 0]}>
        <mesh geometry={parts.nacelle} material={parts.white} position={[0, 0.02, -0.24]} />
        {/* thin blue band on the nacelle: the site accent */}
        <mesh geometry={parts.band} material={parts.accent} position={[0, 0.02, -0.55]} rotation={[Math.PI / 2, 0, 0]} />
        <object3D ref={anchors?.nacelle} position={[0, 0.26, -0.5]} />
        <group ref={rotor} position={[0, 0.02, 0.36]}>
          <mesh geometry={parts.hub} material={parts.white} position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={parts.nose} material={parts.white} />
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
              {/* pitch each blade so the planform reads in 3D */}
              <group rotation={[0, 0.32, 0]}>
                <mesh geometry={parts.root} material={parts.white} position={[0.02, 0.3, 0]} />
                <mesh geometry={parts.blade} material={parts.white} />
                <mesh geometry={parts.bladeTip} material={parts.tip} />
              </group>
            </group>
          ))}
        </group>
        <object3D ref={anchors?.rotor} position={[1.25, 1.1, 0.4]} />
      </group>
    </group>
  )
}

/* ───────────── scene ───────────── */

const smooth = (a: number, b: number, x: number) => MathUtils.smoothstep(x, a, b)

function World({ state, labels }: { state: RefObject<HeroState>; labels: RefObject<(HTMLElement | null)[]> }) {
  const parts = useTurbineParts()
  const { camera, size, scene } = useThree()
  const main = useRef<Group>(null)
  const rotors = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)]
  const anchors = { rotor: useRef<Object3D>(null), nacelle: useRef<Object3D>(null), tower: useRef<Object3D>(null) }
  const sim = useRef({ idle: 0, angle: 0, scroll: typeof window !== "undefined" ? window.scrollY : 0 })
  const tmp = useMemo(() => ({ v: new Vector3(), look: new Vector3(), fog: new Color() }), [])

  useLayoutEffect(() => {
    scene.fog = new Fog(SKY.clone(), 16, 42)
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.05)
    const p = s.progress
    const wide = size.width / size.height > 1.05

    // Blades: scroll scrubs the rotor (≈ one turn per 1 400 px) on top of a slow idle spin.
    const k = sim.current
    // idle spin (off with reduced motion) plus any gust the visitor stirred up
    k.idle += ((s.reduced ? 0 : s.omega) + s.gust) * dt
    s.gust *= Math.exp(-0.9 * dt)
    k.scroll = MathUtils.damp(k.scroll, window.scrollY, 9, dt)
    // with reduced motion there is no idle spin: the blades only follow the scroll
    const target = -(k.idle + k.scroll * 0.0045)
    k.angle = s.reduced ? target : MathUtils.damp(k.angle, target, 14, dt)
    rotors[0].current!.rotation.z = k.angle
    rotors[1].current!.rotation.z = k.angle * 0.8 + 1.1
    rotors[2].current!.rotation.z = k.angle * 0.65 + 2.3

    // Turbine yaws from a three-quarter view toward side-on as you scroll in.
    main.current!.rotation.y = MathUtils.lerp(-0.5, -0.95, smooth(0.05, 0.6, p))
    main.current!.position.x = wide ? Math.min(4.4, (size.width / size.height) * 2.3) : 0

    // Camera: frame the whole machine, push toward the hub for the labels, then pull away.
    const zoomIn = smooth(0.25, 0.55, p)
    const away = smooth(0.7, 1, p)
    const cam = camera as PerspectiveCamera
    const baseDist = wide ? 18.5 : 20
    const dist = baseDist - zoomIn * (wide ? 4.5 : 4) + away * 6
    const lookY = (wide ? 3.6 : 5.6) + zoomIn * (wide ? 0.7 : 0.4) - away * 1.5
    const camX = main.current!.position.x * 0.35
    cam.position.set(camX + zoomIn * 0.6, lookY + 0.6 - away * 0.8, dist)
    tmp.look.set(camX, lookY, 0)
    cam.lookAt(tmp.look)

    // Fog tracks the page background as it dims to navy.
    const dark = smooth(0.62, 0.92, p)
    tmp.fog.copy(SKY).lerp(DEEP, dark)
    ;(scene.fog as Fog).color.copy(tmp.fog)

    // Pin each HTML label to its part on screen.
    const els = labels.current
    if (els) {
      ;[anchors.rotor, anchors.nacelle, anchors.tower].forEach((a, i) => {
        const el = els[i]
        if (!el || !a.current) return
        a.current.getWorldPosition(tmp.v).project(cam)
        const x = (tmp.v.x * 0.5 + 0.5) * size.width
        const y = (-tmp.v.y * 0.5 + 0.5) * size.height
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      })
    }
  })

  return (
    <>
      <hemisphereLight args={["#ffffff", "#8e9bbd", 1.7]} />
      <directionalLight position={[5, 9, 7]} intensity={2.3} color="#fff6ec" />
      <directionalLight position={[-7, 4, -6]} intensity={1.3} color="#9db8ff" />
      <group ref={main}>
        <Turbine parts={parts} rotor={rotors[0]} anchors={anchors} />
      </group>
      {/* two distant turbines, lost a little in the haze */}
      <Turbine parts={parts} rotor={rotors[1]} position={[8.5, -0.8, -16]} rotation={[0, -0.7, 0]} scale={0.9} />
      <Turbine parts={parts} rotor={rotors[2]} position={[0.5, -1.4, -26]} rotation={[0, -0.6, 0]} scale={0.95} />
    </>
  )
}

export default function TurbineScene({
  state,
  labels,
  active,
  lowPower,
  onReady,
}: {
  state: RefObject<HeroState>
  labels: RefObject<(HTMLElement | null)[]>
  active: boolean
  lowPower: boolean
  onReady: () => void
}) {
  return (
    <Canvas
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 4, 16] }}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: lowPower ? "low-power" : "high-performance" }}
      onCreated={() => requestAnimationFrame(() => requestAnimationFrame(onReady))}
      aria-hidden
    >
      <World state={state} labels={labels} />
    </Canvas>
  )
}
