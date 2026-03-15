import { describe, expect, it } from "vitest";
import { compactTranscript } from "./compaction.js";

describe("compactTranscript", () => {
  it("summarizes dropped lines and keeps the tail", () => {
    const output = compactTranscript(
      [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ],
      2,
    );
    expect(output.summary).toContain("user:a");
    expect(output.compacted).toEqual([
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });
});
