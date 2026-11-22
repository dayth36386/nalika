export function getTimezones(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone")
    return zones.includes("UTC") ? zones : ["UTC", ...zones]
  } catch {
    return ["UTC", "Asia/Bangkok", "Asia/Tokyo", "Europe/London", "America/New_York"]
  }
}

/** e.g. "GMT+7" */
export function offsetLabel(timeZone: string, date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")
    return part?.value ?? ""
  } catch {
    return ""
  }
}

/** "Asia/Ho_Chi_Minh" -> "Ho Chi Minh" */
export function cityName(timeZone: string) {
  const last = timeZone.split("/").pop() ?? timeZone
  return last.replace(/_/g, " ")
}

/** Hours/minutes/seconds of `date` as seen in `timeZone`. */
export function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { h: get("hour"), m: get("minute"), s: get("second") }
}

export function parseHHMM(v: string) {
  const [h, m] = v.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
