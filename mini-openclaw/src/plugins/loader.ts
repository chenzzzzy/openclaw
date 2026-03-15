import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ToolDefinition } from "../tools/registry.js";

export type PluginManifest = {
  name: string;
  main: string;
};

export type PluginContext = {
  registerTool(tool: ToolDefinition): void;
  registerChannel(name: string, adapter: unknown): void;
};

export type LoadedPlugin = {
  name: string;
  location: string;
};

export async function loadPlugins(rootDir: string, context: PluginContext): Promise<LoadedPlugin[]> {
  const loaded: LoadedPlugin[] = [];
  const directories = readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const name of directories) {
    const pluginDir = resolve(rootDir, name);
    const manifestPath = join(pluginDir, "plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PluginManifest;
    const modulePath = resolve(pluginDir, manifest.main);
    const module = (await import(pathToFileURL(modulePath).href)) as {
      activate?: (ctx: PluginContext) => Promise<void> | void;
      default?: (ctx: PluginContext) => Promise<void> | void;
    };

    const activate = module.activate ?? module.default;
    if (!activate) {
      throw new Error(`Plugin ${manifest.name} does not export activate/default.`);
    }
    await activate(context);
    loaded.push({
      name: manifest.name,
      location: pluginDir,
    });
  }

  return loaded;
}
