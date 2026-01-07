#!/usr/bin/env bun

import { homedir } from "os";
import { join } from "path";

const LM_STUDIO_URL = "http://127.0.0.1:1234/v1/models";
const CONFIG_PATH = join(homedir(), ".config", "opencode", "opencode.json");

interface LMStudioModel {
  id: string;
  object: string;
  owned_by: string;
}

interface LMStudioResponse {
  data: LMStudioModel[];
  object: string;
}

interface OpenCodeConfig {
  $schema: string;
  provider: {
    lmstudio: {
      npm: string;
      name: string;
      options: {
        baseURL: string;
      };
      models: Record<string, { name: string }>;
    };
  };
}

/**
 * Fetches available models from LM Studio's local API
 */
async function fetchLMStudioModels(): Promise<LMStudioModel[]> {
  const response = await fetch(LM_STUDIO_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as LMStudioResponse;
  return data.data;
}

/**
 * Generates the opencode.json config structure from a list of models
 */
function generateConfig(models: LMStudioModel[]): OpenCodeConfig {
  const modelsRecord: Record<string, { name: string }> = {};

  for (const model of models) {
    modelsRecord[model.id] = { name: model.id };
  }

  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      lmstudio: {
        npm: "@ai-sdk/openai-compatible",
        name: "LM Studio (local)",
        options: {
          baseURL: "http://127.0.0.1:1234/v1",
        },
        models: modelsRecord,
      },
    },
  };
}

/**
 * Main entry point - fetches models and writes config
 */
async function main(): Promise<void> {
  console.log("Fetching models from LM Studio...");

  const models = await fetchLMStudioModels();
  console.log(`Found ${models.length} models`);

  const config = generateConfig(models);

  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  console.log(`Config written to ${CONFIG_PATH}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

