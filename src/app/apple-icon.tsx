import { ImageResponse } from "next/og"
import { BRAND_ICON_DATA_URL } from "@/lib/brand-icon"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  const src = BRAND_ICON_DATA_URL
  return new ImageResponse(
    (
      <img src={src} width={180} height={180} alt="" />
    ),
    size
  )
}
