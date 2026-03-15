import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadLlmProviderConfig } from "./config.js";

describe("loadLlmProviderConfig", () => {
  it("returns null when config file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mini-openclaw-config-"));
    try {
      expect(loadLlmProviderConfig(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads config from config/llm.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "mini-openclaw-config-"));
    try {
      mkdirSync(join(dir, "config"), { recursive: true });
      writeFileSync(
        join(dir, "config", "llm.json"),
        JSON.stringify({
          baseUrl: "https://example.com/v1",
          apiKey: "k",
          model: "m",
        }),
      );
      const config = loadLlmProviderConfig(dir);
      expect(config?.baseUrl).toBe("https://example.com/v1");
      expect(config?.apiKey).toBe("k");
      expect(config?.model).toBe("m");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
