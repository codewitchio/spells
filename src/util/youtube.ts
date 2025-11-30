import { spawn } from "child_process"
import ffmpeg from "fluent-ffmpeg"

export const fetchVideoTitle = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const process = spawn("yt-dlp", ["--get-title", url])
    let data = ""
    process.stdout?.on("data", (chunk) => {
      data += chunk.toString()
    })
    process.on("close", (code) => {
      if (code === 0) resolve(data.trim())
      else reject(new Error(`yt-dlp exited with code ${code}`))
    })
    process.on("error", reject)
  })
}
export const clipSegment = async ({
  url,
  startSeconds,
  endSeconds,
  outputFilepath,
  onProgress,
}: ClipSegmentOptions): Promise<string> => {
  // Ensure output directory exists for all entrypoints.
  // Use yt-dlp's --download-sections to fetch ONLY the clip we need at high quality.
  // This avoids downloading the full video file.
  // -f "bv*[height<=1080]+ba/best[height<=1080]/best": Prefer 1080p best video + best audio, fallback to best single file.
  // --force-keyframes-at-cuts: Ensures precise cuts (re-encodes if needed at boundaries).
  // --merge-output-format mkv: Ensure the pipe stream is in a container (Matroska) that supports mixed streams, so ffmpeg can read it.
  const ytArgs = [
    "--download-sections",
    `*${startSeconds}-${endSeconds}`,
    "-f",
    "bv*[height<=1080]+ba/best[height<=1080]/best",
    "--force-keyframes-at-cuts",
    "--merge-output-format",
    "mkv",
    "-o",
    "-", // Pipe to stdout
    url,
  ]

  return new Promise((resolve, reject) => {
    const ytProcess = spawn("yt-dlp", ytArgs)

    ytProcess.on("error", reject)

    if (!ytProcess.stdout) {
      ytProcess.kill()
      reject(new Error("Failed to spawn yt-dlp stdout"))
      return
    }

    ffmpeg(ytProcess.stdout)
      .output(outputFilepath)
      .videoCodec("libvpx-vp9")
      .audioCodec("libopus")
      // Optional: Add crf/bitrate settings for quality control
      .outputOptions("-crf", "30", "-b:v", "0")
      .on("progress", (progress) => {
        onProgress?.(progress.timemark || "")
      })
      .on("end", () => {
        resolve(outputFilepath)
      })
      .on("error", (err) => {
        ytProcess.kill()
        reject(err)
      })
      .run()
  })
}
export type ClipSegmentOptions = {
  url: string
  startSeconds: number
  endSeconds: number
  outputFilepath: string
  onProgress?: (timemark?: string) => void
}

