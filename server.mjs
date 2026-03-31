#!/usr/bin/env node
import { createServer } from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { renderMermaidSVG, THEMES } from "beautiful-mermaid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;

const html = readFileSync(join(__dirname, "index.html"), "utf-8");

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (req.method === "GET" && req.url === "/api/themes") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Object.keys(THEMES)));
    return;
  }

  if (req.method === "POST" && req.url === "/api/render") {
    const body = await readBody(req);
    try {
      const { mermaid, theme: themeName } = JSON.parse(body);
      const theme = THEMES[themeName] || THEMES["tokyo-night"];
      const svg = renderMermaidSVG(mermaid, theme);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ svg }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Diagram renderer running at http://localhost:${PORT}`);
});

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}
