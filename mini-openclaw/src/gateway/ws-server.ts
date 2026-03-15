import { WebSocketServer, type WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import type { GatewayEvent, GatewayRequestUnion } from "./protocol.js";
import { MiniGatewayRuntime } from "./runtime.js";

export class GatewayWsServer {
  private server: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly runtime: MiniGatewayRuntime,
    private readonly bind: { host?: string; port: number } = { port: 0 },
  ) {}

  async start(): Promise<{ host: string; port: number }> {
    if (this.server) {
      const address = this.server.address() as AddressInfo;
      return { host: address.address, port: address.port };
    }

    const server = new WebSocketServer({
      host: this.bind.host,
      port: this.bind.port,
    });
    this.server = server;

    this.unsubscribe = this.runtime.onEvent((event) => {
      this.broadcast(event);
    });

    server.on("connection", (socket) => {
      this.clients.add(socket);
      socket.on("close", () => {
        this.clients.delete(socket);
      });
      socket.on("message", async (data) => {
        const text = data.toString();
        const parsed = parseRequest(text);
        if (!parsed.ok) {
          socket.send(
            JSON.stringify({
              type: "res",
              id: parsed.id,
              ok: false,
              error: { code: "BAD_REQUEST", message: parsed.error },
            }),
          );
          return;
        }

        const response = await this.runtime.handleRequest(parsed.request);
        socket.send(JSON.stringify(response));
      });
    });

    await new Promise<void>((resolve) => {
      server.on("listening", () => resolve());
    });

    const address = server.address() as AddressInfo;
    return { host: address.address, port: address.port };
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    const server = this.server;
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private broadcast(event: GatewayEvent): void {
    const payload = JSON.stringify(event);
    for (const socket of this.clients) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }
}

function parseRequest(input: string):
  | { ok: true; request: GatewayRequestUnion }
  | { ok: false; id: string; error: string } {
  try {
    const parsed = JSON.parse(input) as Partial<GatewayRequestUnion>;
    if (parsed.type !== "req" || typeof parsed.id !== "string" || typeof parsed.method !== "string") {
      return { ok: false, id: "unknown", error: "Invalid request envelope" };
    }
    return {
      ok: true,
      request: parsed as GatewayRequestUnion,
    };
  } catch (error) {
    return {
      ok: false,
      id: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
