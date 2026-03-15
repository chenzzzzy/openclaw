import type { MessageHistoryLoader, TranscriptWriter } from "../agent/runtime.js";

export type TranscriptEntry = {
  sessionKey: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
};

export type TranscriptStore = MessageHistoryLoader &
  TranscriptWriter & {
    list(sessionKey: string): TranscriptEntry[];
    compact(sessionKey: string, keepLast: number): { summary: string; kept: TranscriptEntry[] };
  };

export class InMemoryTranscriptStore implements TranscriptStore {
  private readonly entries = new Map<string, TranscriptEntry[]>();

  async load(sessionKey: string): Promise<string[]> {
    return (this.entries.get(sessionKey) ?? []).map((entry) => `${entry.role}: ${entry.content}`);
  }

  async append(entry: TranscriptEntry): Promise<void> {
    const list = this.entries.get(entry.sessionKey) ?? [];
    list.push(entry);
    this.entries.set(entry.sessionKey, list);
  }

  list(sessionKey: string): TranscriptEntry[] {
    return [...(this.entries.get(sessionKey) ?? [])];
  }

  compact(sessionKey: string, keepLast: number): { summary: string; kept: TranscriptEntry[] } {
    const current = this.entries.get(sessionKey) ?? [];
    if (current.length <= keepLast) {
      return { summary: "", kept: [...current] };
    }

    const dropped = current.slice(0, current.length - keepLast);
    const kept = current.slice(-keepLast);
    const summary = dropped.map((entry) => `${entry.role}: ${entry.content}`).join(" | ");
    this.entries.set(sessionKey, kept);
    return { summary, kept: [...kept] };
  }
}
