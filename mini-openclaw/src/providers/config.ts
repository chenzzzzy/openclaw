import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type LlmProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export function loadLlmProviderConfig(cwd = process.cwd()): LlmProviderConfig | null {
  const localPath = resolve(cwd, "config", "llm.local.json");
  const defaultPath = resolve(cwd, "config", "llm.json");
  const path = existsSync(localPath) ? localPath : defaultPath;

  if (!existsSync(path)) {
    return null;
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LlmProviderConfig>;
  if (!parsed.baseUrl || !parsed.apiKey || !parsed.model) {
    return null;
  }

  return {
    baseUrl: parsed.baseUrl,
    apiKey: parsed.apiKey,
    model: parsed.model,
    temperature: parsed.temperature,
    maxTokens: parsed.maxTokens,
    timeoutMs: parsed.timeoutMs,
  };
}
