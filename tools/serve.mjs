import http from "node:http";
import { createReadStream } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const file = fileURLToPath(new URL("../index.html", import.meta.url));

function handleRequest(request, response) {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  if (pathname === "/favicon.ico") {
    response.writeHead(204).end();
    return;
  }
  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Introuvable");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8"
  });
  createReadStream(file).pipe(response);
}

export function startAtlasServer({ port = Number(process.env.ATLAS_PORT) || 8765, silent = false } = {}) {
  const server = http.createServer(handleRequest);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      if (!silent) console.log(`Atlas Karst disponible sur http://127.0.0.1:${server.address().port}`);
      resolve(server);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startAtlasServer();

  function shutdown() {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 2_000).unref();
  }

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, shutdown);
}
