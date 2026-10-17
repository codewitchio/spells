#!/usr/bin/env bun
// Find every node_modules under a folder and pick which ones to remove.
// Projects untouched for 2+ weeks are pre-selected.
//
// Usage:  spells nuke-modules [folder]   (default: current folder)
//
// "Last touched" = newest file in the project, ignoring node_modules, .git and
// build output (.next, dist, build, .turbo, .cache, coverage).
import {
  cancel,
  groupMultiselect,
  intro,
  isCancel,
  outro,
  spinner,
} from "@clack/prompts"
import { $ } from "bun"
import { readdir, rm, stat } from "fs/promises"
import { homedir } from "os"
import { dirname, join, relative, resolve } from "path"

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "coverage",
])

type Entry = {
  path: string
  sizeKb: number
  lastTouched: number
}

const listDirs = async (dir: string) => {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

// Stops at each node_modules, so nested ones (node_modules/foo/node_modules)
// are not listed separately.
const findNodeModules = async (dir: string, found: string[] = []) => {
  for (const entry of await listDirs(dir)) {
    if (!entry.isDirectory() || entry.name === ".git") continue
    const path = join(dir, entry.name)
    if (entry.name === "node_modules") found.push(path)
    else await findNodeModules(path, found)
  }
  return found
}

const newestFileTime = async (dir: string): Promise<number> => {
  let newest = 0
  for (const entry of await listDirs(dir)) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name))
        newest = Math.max(newest, await newestFileTime(path))
    } else if (entry.isFile()) {
      const { mtimeMs } = await stat(path).catch(() => ({ mtimeMs: 0 }))
      newest = Math.max(newest, mtimeMs)
    }
  }
  return newest
}

const sizeKb = async (path: string) => {
  const out = await $`du -sk ${path}`.nothrow().quiet().text()
  return Number.parseInt(out, 10) || 0
}

const inspect = async (nm: string): Promise<Entry> => {
  const project = dirname(nm)
  const [size, newest] = await Promise.all([
    sizeKb(nm),
    newestFileTime(project),
  ])
  const lastTouched = newest || (await stat(project)).mtimeMs
  return { path: nm, sizeKb: size, lastTouched }
}

const human = (kb: number) => {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`
  if (kb >= 1024) return `${Math.round(kb / 1024)} MB`
  return `${kb} KB`
}

const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const prettyPath = (path: string) => {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

const totalKb = (entries: Entry[]) =>
  entries.reduce((sum, entry) => sum + entry.sizeKb, 0)

const toOption = (root: string) => (entry: Entry) => ({
  value: entry.path,
  label: `${human(entry.sizeKb).padStart(8)}  ${formatDate(entry.lastTouched)}  ${relative(root, dirname(entry.path)) || "."}`,
})

export const main = async () => {
  // argv[2] is the command name when run through `spells`
  const rootArg = process.argv[import.meta.main ? 2 : 3]
  const root = resolve(rootArg ?? ".")

  intro("node_modules cleanup")

  const scan = spinner()
  scan.start(`Looking for node_modules in ${prettyPath(root)}`)
  const paths = await findNodeModules(root)
  const entries: Entry[] = []
  for (let i = 0; i < paths.length; i += 8) {
    scan.message(
      `Measuring ${i + 1}–${Math.min(i + 8, paths.length)} of ${paths.length}`,
    )
    entries.push(...(await Promise.all(paths.slice(i, i + 8).map(inspect))))
  }
  scan.stop(`Found ${entries.length} node_modules (${human(totalKb(entries))})`)

  if (entries.length === 0) {
    outro("Nothing to clean up.")
    return
  }

  const cutoff = Date.now() - STALE_AFTER_MS
  const bySize = (a: Entry, b: Entry) => b.sizeKb - a.sizeKb
  const stale = entries.filter((e) => e.lastTouched < cutoff).sort(bySize)
  const recent = entries.filter((e) => e.lastTouched >= cutoff).sort(bySize)

  const groups: Record<string, ReturnType<ReturnType<typeof toOption>>[]> = {}
  if (stale.length)
    groups[`Untouched for 2+ weeks (${human(totalKb(stale))})`] = stale.map(
      toOption(root),
    )
  if (recent.length)
    groups[`Touched recently (${human(totalKb(recent))})`] = recent.map(
      toOption(root),
    )

  const selected = await groupMultiselect({
    message: "Select node_modules to remove",
    options: groups,
    initialValues: stale.map((e) => e.path),
    required: false,
    maxItems: Math.max(5, (process.stdout.rows ?? 24) - 8),
  })

  if (isCancel(selected)) {
    cancel("Nothing removed.")
    process.exit(0)
  }

  if (selected.length === 0) {
    outro("Nothing removed.")
    return
  }

  const toRemove = entries.filter((e) => selected.includes(e.path))
  const removing = spinner()
  removing.start(`Removing ${toRemove.length} node_modules`)
  for (const [i, entry] of toRemove.entries()) {
    removing.message(
      `Removing ${i + 1} of ${toRemove.length}: ${prettyPath(entry.path)}`,
    )
    await rm(entry.path, { recursive: true, force: true })
  }
  removing.stop(`Removed ${toRemove.length} node_modules`)

  outro(`Freed ${human(totalKb(toRemove))} ✨`)
}

if (import.meta.main) {
  void main()
}
