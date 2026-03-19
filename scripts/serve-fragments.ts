import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");

const server = createServer((req, res) => {
  const fileName = basename(req.url || "");
  const filePath = join(FRAGMENTS_DIR, fileName);

  if (!fileName || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  res.writeHead(200, {
    "Content-Type": "text/markdown",
    "Content-Length": Buffer.byteLength(content).toString(),
  });
  res.end(content);
});

server.listen(config.fragmentServerPort, () => {
  console.log(
    `Fragment server running at http://localhost:${config.fragmentServerPort}`
  );
  console.log(`Serving files from: ${FRAGMENTS_DIR}`);
});
