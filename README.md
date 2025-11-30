# Codewitch's Spells ✨

A repository of personal scripts and tools.

## Prerequisites

Ensure you have the following installed on your system:

- [Bun](https://bun.sh/)
- [FFmpeg](https://ffmpeg.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be in your PATH)

## Installation

```bash
bun install
```

# Youtube clipper

## Usage

Run the clipper with a YouTube URL, start time, and end time:

```bash
bun run clip --url <YOUTUBE_URL> --start <START_TIME> --end <END_TIME>
```

The tool defaults to **1080p** (or best available < 1080p) and exports to `.webm` (VP9/Opus).

### Time Formats

Supported time formats:

- Seconds: `30`, `90.5`
- Minutes:Seconds: `1:30`, `01:30`
- Hours:Minutes:Seconds: `1:30:05`
- Units: `1h 30m 5s`, `90s`

### Examples

Clip from 0:10 to 0:15:

```bash
bun run clip --url "https://www.youtube.com/watch?v=aqz-KE-bpKQ" --start 10 --end 15
```

Clip from 1m 30s to 1m 45s:

```bash
bun run clip --url "https://www.youtube.com/watch?v=aqz-KE-bpKQ" --start "1m30s" --end "1m45s"
```

## Output

The tool exports a `.webm` file to the `./clips` directory.

