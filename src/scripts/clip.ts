#!/usr/bin/env bun
import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts"
import { parseTime, sanitizeTitle } from "../util/input"
import { clipSegment, fetchVideoTitle } from "../util/youtube"

const ensureResponse = (value: string | symbol): string => {
  if (isCancel(value)) {
    cancel("Operation cancelled.")
    process.exit(0)
  }

  return value
}

export const main = async () => {
  intro("YouTube clipper (interactive)")

  const urlInput = await text({
    message: "Paste the YouTube link",
    validate: (value) => {
      if (!value?.trim()) return "URL is required"
      if (!value.startsWith("http")) return "Provide a valid URL"
      return
    },
  })
  const url = ensureResponse(urlInput).trim()

  const startInput = await text({
    message: "Start time (e.g. 1m30s or 00:01:30)",
    initialValue: "0",
    validate: (value) => {
      if (!value?.trim()) return "Start time is required"
      const seconds = parseTime(value)
      if (Number.isNaN(seconds)) return "Enter a valid time expression"
      return
    },
  })
  const startTime = ensureResponse(startInput)
  const startSeconds = parseTime(startTime)

  const endInput = await text({
    message: "End time",
    validate: (value) => {
      if (!value?.trim()) return "End time is required"
      const seconds = parseTime(value)
      if (Number.isNaN(seconds)) return "Enter a valid time expression"
      if (seconds <= startSeconds)
        return "End time must be greater than start time"
      return
    },
  })
  const endTime = ensureResponse(endInput)
  const endSeconds = parseTime(endTime)

  const duration = endSeconds - startSeconds
  if (duration <= 0) {
    cancel("End time must be greater than start time.")
    process.exit(1)
  }

  const titleSpinner = spinner()
  titleSpinner.start("Fetching video title...")
  let titleRaw: string

  try {
    titleRaw = await fetchVideoTitle(url)
    titleSpinner.stop(`Video detected: ${titleRaw}`)
  } catch (error) {
    titleSpinner.stop("Failed to fetch video title.")
    cancel((error as Error).message || "Unknown error")
    process.exit(1)
  }

  const defaultBasename = sanitizeTitle(titleRaw)
  const filenameInput = await text({
    message: "Save file as (without extension)",
    initialValue: defaultBasename,
    validate: (value) => {
      if (!value?.trim()) return "Filename is required"
      return
    },
  })
  const chosenName = ensureResponse(filenameInput)
  const sanitizedBasename =
    sanitizeTitle(chosenName) || sanitizeTitle(defaultBasename)
  const outputFilepath = `${sanitizedBasename}.webm`

  const clipSpinner = spinner()
  clipSpinner.start("Downloading and clipping segment...")

  try {
    await clipSegment({
      url,
      startSeconds,
      endSeconds,
      outputFilepath,
      onProgress: (timemark) => {
        clipSpinner.message(
          `Processing ${timemark && timemark !== "N/A" ? timemark : ""}`.trim()
        )
      },
    })
    clipSpinner.stop(`Saved to ${outputFilepath}`)
  } catch (error) {
    clipSpinner.stop("Failed to create clip.")
    cancel((error as Error).message || "Unknown error")
    process.exit(1)
  }

  outro("Clip ready! 🎬")
}

// Run main if this file is executed directly (not imported)
if (import.meta.main) {
  void main()
}

