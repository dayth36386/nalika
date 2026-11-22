"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Sparkles } from "@react-three/drei"
import * as THREE from "three"
import type { ScenePalette } from "@/lib/settings"

type Palette = { bg: string; a: string; b: string; c: string }

const PALETTES: Record<ScenePalette, { dark: Palette; light: Palette }> = {
  aurora: {
    dark: { bg: "#05060d", a: "#4f46e5", b: "#22d3ee", c: "#a78bfa" },
    light: { bg: "#eef1f8", a: "#4f46e5", b: "#0891b2", c: "#7c3aed" },
  },
  sunset: {
    dark: { bg: "#0c0508", a: "#f43f5e", b: "#f59e0b", c: "#fb7185" },
    light: { bg: "#fbf1ee", a: "#e11d48", b: "#d97706", c: "#f43f5e" },
  },
  ocean: {
    dark: { bg: "#020a0f", a: "#0ea5e9", b: "#34d399", c: "#38bdf8" },
    light: { bg: "#edf6f7", a: "#0369a1", b: "#059669", c: "#0284c7" },
  },
  mono: {
    dark: { bg: "#08080a", a: "#52525b", b: "#f4f4f5", c: "#d4d4d8" },
    light: { bg: "#f4f4f5", a: "#a1a1aa", b: "#18181b", c: "#3f3f46" },
  },
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  varying float vElev;
  varying float vDist;

  void main() {
    vec3 p = position;
    float t = uTime;
    float e = sin(p.x * 0.28 + t * 0.9) * 0.55
            + cos(p.z * 0.36 + t * 0.7) * 0.45
            + sin((p.x + p.z) * 0.12 + t * 0.4) * 0.9
            + sin(length(p.xz) * 0.35 - t * 1.2) * 0.35;
    p.y += e;
    vElev = e;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_PointSize = uSize * (22.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uBg;
  uniform float uFar;
  uniform float uBoost;
  varying float vElev;
  varying float vDist;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, d);
    vec3 col = mix(uColorA, uColorB, smoothstep(-1.6, 1.6, vElev));
    float fog = smoothstep(uFar * 0.25, uFar, vDist);
    col = mix(col, uBg, fog);
    gl_FragColor = vec4(col * uBoost, alpha * (1.0 - fog * 0.85));
    #include <colorspace_fragment>
  }
`

function WaveField({ palette, dark, speed }: { palette: Palette; dark: boolean; speed: number }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const elapsed = useRef(0)

  const geometry = useMemo(() => {
    const count = 180
    const spacing = 0.36
    const positions = new Float32Array(count * count * 3)
    let i = 0
    for (let x = 0; x < count; x++) {
      for (let z = 0; z < count; z++) {
        positions[i++] = (x - count / 2) * spacing
        positions[i++] = 0
        positions[i++] = (z - count / 2) * spacing
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.6 },
      uBoost: { value: 1.4 },
      uFar: { value: 42 },
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
      uBg: { value: new THREE.Color() },
    }),
    []
  )

  const targets = useMemo(
    () => ({ a: new THREE.Color(palette.a), b: new THREE.Color(palette.b), bg: new THREE.Color(palette.bg) }),
    [palette]
  )

  useFrame((_, delta) => {
    const m = material.current
    if (!m) return
    elapsed.current += delta * speed
    m.uniforms.uTime.value = elapsed.current
    m.uniforms.uBoost.value = dark ? 1.4 : 1.0
    // ease colors so theme / palette switches blend smoothly
    m.uniforms.uColorA.value.lerp(targets.a, 0.06)
    m.uniforms.uColorB.value.lerp(targets.b, 0.06)
    m.uniforms.uBg.value.lerp(targets.bg, 0.06)
  })

  return (
    <points geometry={geometry} position={[0, -2.2, 0]}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

function CameraRig() {
  useFrame(({ camera, pointer }, delta) => {
    const k = 1 - Math.pow(0.02, delta)
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * k
    camera.position.y += (1.4 + pointer.y * 0.8 - camera.position.y) * k
    camera.lookAt(0, -0.6, -6)
  })
  return null
}

function Background({ color }: { color: string }) {
  const ref = useRef<THREE.Color>(null)
  const target = useMemo(() => new THREE.Color(color), [color])
  useFrame(() => ref.current?.lerp(target, 0.06))
  return <color ref={ref} attach="background" args={[color]} />
}

export default function ThreeBackground({
  palette = "aurora",
  dark = true,
  speed = 1,
}: {
  palette?: ScenePalette
  dark?: boolean
  speed?: number
}) {
  const p = PALETTES[palette][dark ? "dark" : "light"]
  return (
    <Canvas
      className="!fixed inset-0 -z-10"
      camera={{ position: [0, 1.4, 8], fov: 60, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Background color={p.bg} />
      <WaveField palette={p} dark={dark} speed={speed} />
      <Sparkles
        count={140}
        scale={[22, 8, 14]}
        position={[0, 2, -4]}
        size={dark ? 2.4 : 1.8}
        speed={0.25 * speed}
        opacity={dark ? 0.8 : 0.5}
        color={p.c}
      />
      <CameraRig />
    </Canvas>
  )
}
