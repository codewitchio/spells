export const parseTime = (time: string): number => {
  if (!time) return 0

  // Handle "1h 2m 30s" format
  if (time.match(/[hms]/)) {
    const h = time.match(/(\d+)h/)?.[1] || "0"
    const m = time.match(/(\d+)m/)?.[1] || "0"
    const sMatch = time.match(/(\d+(\.\d+)?)s/)
    const s = sMatch?.[1] || "0"

    const hours = parseFloat(h)
    const minutes = parseFloat(m)
    const seconds = parseFloat(s)

    return hours * 3600 + minutes * 60 + seconds
  }

  // Handle "HH:MM:SS:MS" or "HH:MM:SS.MS" or "MM:SS"
  const parts = time.split(":").map(Number)

  if (parts.length === 4) {
    const h = parts[0] || 0
    const m = parts[1] || 0
    const s = parts[2] || 0
    const ms = parts[3] || 0
    return h * 3600 + m * 60 + s + ms / 1000
  }

  if (parts.length === 3) {
    const h = parts[0] || 0
    const m = parts[1] || 0
    const s = parts[2] || 0
    return h * 3600 + m * 60 + s
  }

  if (parts.length === 2) {
    const m = parts[0] || 0
    const s = parts[1] || 0
    return m * 60 + s
  }

  return parseFloat(time)
}

export const sanitizeTitle = (title: string): string => {
  const normalized = title
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^-+|-+$/g, "")
    .replace(/^_+|_+$/g, "")

  return normalized || "clip"
}

