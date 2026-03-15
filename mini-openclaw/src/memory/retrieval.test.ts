import { describe, expect, it } from "vitest";
import { InMemoryRetriever } from "./retrieval.js";

describe("InMemoryRetriever", () => {
  it("returns keyword+recency ranked hits", () => {
    const retriever = new InMemoryRetriever();
    retriever.add({
      id: "1",
      sessionKey: "agent:main:main",
      text: "alpha beta",
      timestamp: 1_000,
    });
    retriever.add({
      id: "2",
      sessionKey: "agent:main:main",
      text: "alpha recent",
      timestamp: 10_000,
    });

    const hits = retriever.search({
      sessionKey: "agent:main:main",
      query: "alpha",
      now: 10_500,
    });
    expect(hits[0]?.id).toBe("2");
    expect(hits.length).toBeGreaterThan(0);
  });
});
