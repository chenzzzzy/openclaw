export type TranscriptLine = {
  role: "user" | "assistant" | "tool";
  content: string;
};

export function compactTranscript(lines: TranscriptLine[], keepLast: number): {
  summary: string;
  compacted: TranscriptLine[];
} {
  if (lines.length <= keepLast) {
    return {
      summary: "",
      compacted: [...lines],
    };
  }

  const dropped = lines.slice(0, lines.length - keepLast);
  const compacted = lines.slice(-keepLast);
  return {
    summary: dropped.map((line) => `${line.role}:${line.content}`).join(" | "),
    compacted,
  };
}
