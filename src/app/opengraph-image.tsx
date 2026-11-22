import { ImageResponse } from "next/og"
import { BRAND_ICON_DATA_URL } from "@/lib/brand-icon"

export const alt = "Nalika — full-screen clock for work and exams"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  const icon = BRAND_ICON_DATA_URL

  // a faint dotted "wave" like the live 3D background
  const dots: { x: number; y: number; o: number }[] = []
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 40; col++) {
      const x = col * 31 + (row % 2) * 15
      const y = 470 + row * 24 + Math.sin(col * 0.35 + row * 0.6) * 18
      dots.push({ x, y, o: 0.15 + (row / 7) * 0.45 })
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#05060d",
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(34,211,238,0.25), transparent 45%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: 4,
              height: 4,
              borderRadius: 4,
              background: i % 3 === 0 ? "#22d3ee" : "#818cf8",
              opacity: d.o,
            }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 56, padding: "0 96px", marginTop: -40 }}>
          <img src={icon} width={200} height={200} alt="" style={{ borderRadius: 46 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Nalika</div>
            <div style={{ fontSize: 38, color: "rgba(255,255,255,0.65)", marginTop: 22 }}>
              Full-screen clock for work & exams
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 34, fontSize: 24, color: "rgba(255,255,255,0.55)" }}>
              <span>Countdown</span>
              <span>·</span>
              <span>3D backgrounds</span>
              <span>·</span>
              <span>4 languages</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
