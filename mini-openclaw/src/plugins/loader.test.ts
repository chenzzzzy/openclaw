import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadPlugins } from "./loader.js";
import type { ToolDefinition } from "../tools/registry.js";

describe("loadPlugins", () => {
  it("loads plugin and allows registration without core edits", async () => {
    const root = mkdtempSync(join(tmpdir(), "mini-openclaw-plugin-"));
    try {
      const pluginDir = join(root, "demo-plugin");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, "plugin.json"),
        JSON.stringify({
          name: "demo-plugin",
          main: "index.mjs",
        }),
      );
      writeFileSync(
        join(pluginDir, "index.mjs"),
        `
export async function activate(ctx) {
  ctx.registerTool({
    name: "plugin_tool",
    description: "from plugin",
    async execute() { return { ok: true }; }
  });
}
`,
      );

      const tools: ToolDefinition[] = [];
      const channels: string[] = [];
      const loaded = await loadPlugins(root, {
        registerTool(tool) {
          tools.push(tool);
        },
        registerChannel(name) {
          channels.push(name);
        },
      });

      expect(loaded).toHaveLength(1);
      expect(tools.map((tool) => tool.name)).toContain("plugin_tool");
      expect(channels).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
