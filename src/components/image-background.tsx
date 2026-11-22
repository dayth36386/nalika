"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Sparkles } from "@react-three/drei"
import * as THREE from "three"
import type { ImageEffect } from "@/lib/settings"

const EFFECT_ID: Record<ImageEffect, number> = { none: 0, drift: 1, parallax: 2, liquid: 3, ripple: 4 }

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uTime;
  uniform vec2 uMouse;        // eased, -1..1
  uniform float uScreenAspect;
  uniform float uImageAspect;
  uniform int uMode;
  uniform float uStrength;
  uniform float uGrain;
  uniform float uReveal;      // 0..1 fade-in
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float t = uTime;
    float s = uStrength;

    // object-fit: cover
    vec2 uv = vUv;
    vec2 scale = uScreenAspect > uImageAspect
      ? vec2(1.0, uImageAspect / uScreenAspect)
      : vec2(uScreenAspect / uImageAspect, 1.0);

    float zoom = 1.0;
    vec2 pan = vec2(0.0);

    if (uMode == 1) {            // drift (Ken Burns)
      zoom = 1.08 + 0.07 * s * (0.5 + 0.5 * sin(t * 0.045));
      pan = vec2(sin(t * 0.031), cos(t * 0.023)) * 0.6;
    } else if (uMode == 2) {     // parallax
      zoom = 1.06 + 0.04 * s;
      pan = -uMouse * 0.9;
    } else if (uMode == 3) {     // liquid
      zoom = 1.06 + 0.02 * s;
      pan = vec2(sin(t * 0.02), cos(t * 0.017)) * 0.3 - uMouse * 0.2;
    } else if (uMode == 4) {     // ripple
      zoom = 1.05;
      pan = -uMouse * 0.3;
    }

    float margin = (1.0 - 1.0 / zoom) * 0.5;
    uv = (uv - 0.5) * scale / zoom + 0.5 + pan * margin * scale;

    if (uMode == 3) {
      vec2 q = vUv * vec2(uScreenAspect, 1.0) * 1.6;
      float n1 = fbm(q + vec2(t * 0.08, t * 0.05));
      float n2 = fbm(q + vec2(5.2 - t * 0.06, 1.3 + t * 0.07));
      uv += (vec2(n1, n2) - 0.5) * 0.035 * s * scale;
    }

    if (uMode == 4) {
      vec2 m = uMouse * 0.5 + 0.5;
      vec2 p = vUv - m;
      p.x *= uScreenAspect;
      float d = length(p);
      float wave = sin(d * 42.0 - t * 3.2) * exp(-d * 4.5);
      // ambient slow ripples so it's alive even without the mouse
      vec2 c = vec2(0.5 + 0.25 * sin(t * 0.13), 0.5 + 0.2 * cos(t * 0.11));
      vec2 p2 = vUv - c; p2.x *= uScreenAspect;
      float d2 = length(p2);
      float wave2 = sin(d2 * 26.0 - t * 1.4) * exp(-d2 * 2.5) * 0.5;
      uv += (normalize(p + 1e-5) * wave + normalize(p2 + 1e-5) * wave2) * 0.006 * s * scale;
    }

    uv = clamp(uv, 0.0, 1.0);
    vec3 col = texture2D(uTex, uv).rgb;

    // subtle chromatic shimmer on liquid
    if (uMode == 3) {
      float off = 0.0015 * s;
      col.r = texture2D(uTex, clamp(uv + vec2(off, 0.0), 0.0, 1.0)).r;
      col.b = texture2D(uTex, clamp(uv - vec2(off, 0.0), 0.0, 1.0)).b;
    }

    // vignette
    vec2 vv = vUv - 0.5;
    col *= 1.0 - dot(vv, vv) * 0.55;

    // film grain (in display space, after color conversion below would be nicer but this is fine)
    col += (hash(vUv * 1000.0 + fract(t * 7.0)) - 0.5) * 0.06 * uGrain;

    gl_FragColor = vec4(col * uReveal, 1.0);
    #include <colorspace_fragment>
  }
`

function useWindowMouse() {
  const target = useRef(new THREE.Vector2())
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])
  return target
}

function ImagePlane({
  src,
  effect,
  strength,
  grain,
}: {
  src: string
  effect: ImageEffect
  strength: number
  grain: boolean
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const mouseTarget = useWindowMouse()
  const mouse = useRef(new THREE.Vector2())
  const size = useThree((s) => s.size)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let disposed = false
    new THREE.TextureLoader().load(src, (tex) => {
      if (disposed) return tex.dispose()
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      setTexture(tex)
    })
    return () => {
      disposed = true
    }
  }, [src])

  useEffect(() => () => texture?.dispose(), [texture])

  const uniforms = useMemo(
    () => ({
      uTex: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uScreenAspect: { value: 1 },
      uImageAspect: { value: 1 },
      uMode: { value: 1 },
      uStrength: { value: 1 },
      uGrain: { value: 1 },
      uReveal: { value: 0 },
    }),
    []
  )

  useFrame((_, delta) => {
    const m = material.current
    if (!m || !texture) return
    const img = texture.image as { width: number; height: number }
    const u = m.uniforms
    u.uTex.value = texture
    u.uImageAspect.value = img.width / img.height
    u.uScreenAspect.value = size.width / size.height
    u.uTime.value += delta
    u.uMode.value = EFFECT_ID[effect]
    u.uStrength.value += (strength - u.uStrength.value) * Math.min(1, delta * 4)
    u.uGrain.value += ((grain ? 1 : 0) - u.uGrain.value) * Math.min(1, delta * 4)
    u.uReveal.value = Math.min(1, u.uReveal.value + delta * 1.2)
    mouse.current.lerp(mouseTarget.current, 1 - Math.pow(0.03, delta))
    u.uMouse.value.copy(mouse.current)
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function ImageBackground({
  src,
  effect,
  strength,
  particles,
  grain,
  blur,
  dim,
}: {
  src: string
  effect: ImageEffect
  strength: number
  particles: boolean
  grain: boolean
  blur: number
  dim: number
}) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      <Canvas
        className="!absolute"
        style={{
          // oversize the canvas while blurred so the soft edges stay off-screen
          left: -blur * 2,
          top: -blur * 2,
          width: `calc(100% + ${blur * 4}px)`,
          height: `calc(100% + ${blur * 4}px)`,
          filter: blur ? `blur(${blur}px)` : undefined,
          transition: "filter 300ms",
        }}
        camera={{ position: [0, 0, 8], fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <ImagePlane src={src} effect={effect} strength={strength} grain={grain} />
        {particles && (
          <Sparkles count={90} scale={[16, 10, 6]} size={4} speed={0.3} opacity={0.65} noise={1.2} color="#fff8e7" />
        )}
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-black transition-opacity" style={{ opacity: dim / 100 }} />
    </div>
  )
}
