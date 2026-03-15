export type MemoryChunk = {
  id: string;
  sessionKey: string;
  text: string;
  timestamp: number;
};

export type MemoryHit = MemoryChunk & {
  score: number;
};

export class InMemoryRetriever {
  private readonly chunks: MemoryChunk[] = [];

  add(chunk: MemoryChunk): void {
    this.chunks.push(chunk);
  }

  search(params: { sessionKey?: string; query: string; limit?: number; now?: number }): MemoryHit[] {
    const query = normalize(params.query);
    const limit = params.limit ?? 5;
    const now = params.now ?? Date.now();

    return this.chunks
      .filter((chunk) => (params.sessionKey ? chunk.sessionKey === params.sessionKey : true))
      .map((chunk) => ({
        ...chunk,
        score: scoreChunk(chunk, query, now),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreChunk(chunk: MemoryChunk, queryTokens: string[], now: number): number {
  const text = chunk.text.toLowerCase();
  const keyword = queryTokens.reduce((acc, token) => (text.includes(token) ? acc + 1 : acc), 0);
  const ageHours = Math.max(0, (now - chunk.timestamp) / 3_600_000);
  const recency = 1 / (1 + ageHours);
  return keyword * 0.8 + recency * 0.2;
}
