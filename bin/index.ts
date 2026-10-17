#!/usr/bin/env bun
import { readdir } from "fs/promises"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get the command name from CLI arguments
const commandName = process.argv[2]

// Get available commands from src/scripts directory
const getAvailableCommands = async (): Promise<string[]> => {
  const scriptsDir = join(__dirname, "../src/scripts")
  try {
    const files = await readdir(scriptsDir)
    return files
      .filter((file) => file.endsWith(".ts") && !file.startsWith("_"))
      .map((file) => file.replace(".ts", ""))
  } catch (error) {
    console.error(`Error reading scripts directory: ${error}`)
    return []
  }
}

// Execute a command by importing and running its main function
const executeCommand = async (cmd: string): Promise<void> => {
  const scriptPath = join(__dirname, `../src/scripts/${cmd}.ts`)

  try {
    const module = await import(scriptPath)
    // If the module exports a main function, call it
    // Otherwise, the script may execute directly on import (backward compatibility)
    if (typeof module.main === "function") {
      await module.main()
    }
    // If no main export, assume the script executed on import (for backward compatibility)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
      console.error(`Command "${cmd}" not found.`)
      console.error(
        `Available commands: ${(await getAvailableCommands()).join(", ")}`
      )
      process.exit(1)
    } else {
      console.error(`Error executing command "${cmd}":`, error)
      process.exit(1)
    }
  }
}

// Show help/command list
const showHelp = async (): Promise<void> => {
  const commands = await getAvailableCommands()

  console.log("codewitch's spells ✨")
  console.log("")
  console.log("Usage: spells <command>")
  console.log("")
  console.log("Available commands:")

  if (commands.length === 0) {
    console.log("  (no commands found)")
  } else {
    commands.forEach((cmd) => {
      console.log(`  ${cmd}`)
    })
  }
}

// Main entry point
const main = async (): Promise<void> => {
  if (!commandName) {
    await showHelp()
    process.exit(0)
  }

  const availableCommands = await getAvailableCommands()

  if (!availableCommands.includes(commandName)) {
    console.error(`Unknown command: "${commandName}"`)
    console.error("")
    await showHelp()
    process.exit(1)
  }

  await executeCommand(commandName)
}

void main()

