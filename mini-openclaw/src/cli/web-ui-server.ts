import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export async function runWebUiServer(port = 4173): Promise<{ port: number; stop: () => Promise<void> }> {
  const root = resolve(process.cwd(), "web");
  const server = createServer((req, res) => {
    const pathname = req.url && req.url !== "/" ? req.url : "/chat.html";
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    const fullPath = resolve(root, `.${safePath}`);

    if (!fullPath.startsWith(root) || !existsSync(fullPath) || !statSync(fullPath).isFile()) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    const ext = extname(fullPath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    res.end(readFileSync(fullPath));
  });

  await new Promise<void>((resolveReady) => {
    server.listen(port, "127.0.0.1", () => resolveReady());
  });
  const address = server.address() as AddressInfo;

  return {
    port: address.port,
    stop: async () => {
      await new Promise<void>((resolveDone, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolveDone();
        });
      });
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? "4173");
  runWebUiServer(port)
    .then((server) => {
      process.stdout.write(`web ui on http://127.0.0.1:${server.port}/chat.html\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
