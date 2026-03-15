import type { AgentTurnInput, PromptBuilder } from "./runtime.js";

export class DefaultPromptBuilder implements PromptBuilder {
  build(input: AgentTurnInput, history: string[]): string {
    const tools = input.availableTools.length > 0 ? input.availableTools.join(", ") : "none";
    const historyHint = history.length > 0 ? `History lines: ${history.length}.` : "No history yet.";
    return `${input.systemPrompt}\nAvailable tools: ${tools}\n${historyHint}`;
  }
}
