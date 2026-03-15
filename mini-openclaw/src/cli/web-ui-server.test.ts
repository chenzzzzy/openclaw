import { describe, expect, it } from "vitest";
import { runWebUiServer } from "./web-ui-server.js";

describe("runWebUiServer", () => {
  it("serves chat.html", async () => {
    const server = await runWebUiServer(0);
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/chat.html`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(html).toContain("Mini OpenClaw Web Chat");
    } finally {
      await server.stop();
    }
  });
});
