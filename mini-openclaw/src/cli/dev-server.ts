import { pathToFileURL } from "node:url";
import { MiniGatewayRuntime } from "../gateway/runtime.js";
import { GatewayWsServer } from "../gateway/ws-server.js";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { ToolRegistry } from "../tools/registry.js";
import { createBuiltinTools } from "../tools/builtins.js";
import { InMemoryRetriever } from "../memory/retrieval.js";
import { InMemoryTranscriptStore } from "../store/transcript-store.js";
import { loadLlmProviderConfig } from "../providers/config.js";
import { OpenAICompatibleProvider } from "../providers/openai-compatible.js";

class EchoProvider implements ProviderAdapter {
  id = "echo-provider";

  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    return {
      kind: "message",
      text: `echo:${input.message}`,
    };
  }
}

export async function runDevGatewayServer(port = 18789): Promise<{ stop: () => Promise<void> }> {
  const memory = new InMemoryRetriever();
  const transcripts = new InMemoryTranscriptStore();
  const tools = new ToolRegistry();
  const llmConfig = loadLlmProviderConfig();
  for (const tool of createBuiltinTools({ workspaceRoot: process.cwd(), memory })) {
    tools.register(tool);
  }
  const provider = resolveProvider(llmConfig);

  const runtime = new MiniGatewayRuntime({
    provider,
    tools,
    historyLoader: transcripts,
    transcriptWriter: transcripts,
    streaming: {
      enableDeltaStream: true,
      deltaChunkSize: 8,
      deltaChunkDelayMs: 20,
    },
  });
  const server = new GatewayWsServer(runtime, { port });
  const address = await server.start();
  process.stdout.write(`provider: ${provider.id}\n`);
  process.stdout.write(`gateway ws listening on ws://${address.host}:${address.port}\n`);
  return {
    stop: async () => server.stop(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? "18789");
  runDevGatewayServer(port).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

function resolveProvider(config: ReturnType<typeof loadLlmProviderConfig>): ProviderAdapter {
  if (
    config &&
    !config.apiKey.startsWith("YOUR_") &&
    !config.baseUrl.includes("your-openai-compatible-endpoint") &&
    !config.model.startsWith("YOUR_")
  ) {
    return new OpenAICompatibleProvider(config);
  }

  process.stdout.write(
    "LLM config not ready. Using EchoProvider. Edit config/llm.json (or config/llm.local.json) to enable real LLM.\n",
  );
  return new EchoProvider();
}
