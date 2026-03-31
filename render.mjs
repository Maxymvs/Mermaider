#!/usr/bin/env node
import { renderMermaidSVG, THEMES } from "beautiful-mermaid";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { basename, join, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const themeFlag = args.find((a) => a.startsWith("--theme="));
const themeName = themeFlag ? themeFlag.split("=")[1] : "tokyo-night";
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.log(`Usage: node render.mjs <file.md|file.mmd> [--theme=${Object.keys(THEMES).join("|")}]`);
  process.exit(1);
}

const theme = THEMES[themeName];
if (!theme) {
  console.error(`Unknown theme "${themeName}". Available: ${Object.keys(THEMES).join(", ")}`);
  process.exit(1);
}

const outputDir = join(__dirname, "output");
mkdirSync(outputDir, { recursive: true });

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const ext = extname(file);
  const base = basename(file, ext);

  // .mmd = single mermaid diagram, .md = extract ```mermaid blocks
  const blocks = ext === ".mmd"
    ? [{ slug: base, content }]
    : extractMermaidBlocks(content, base);

  if (blocks.length === 0) {
    console.log(`  No mermaid blocks found in ${file}`);
    continue;
  }

  console.log(`${file}: ${blocks.length} diagram(s)`);
  for (const block of blocks) {
    try {
      const svg = renderMermaidSVG(block.content, theme);
      const outPath = join(outputDir, `${block.slug}.svg`);
      writeFileSync(outPath, svg);
      console.log(`  [ok] ${block.slug}.svg`);
    } catch (err) {
      console.error(`  [FAIL] ${block.slug}: ${err.message}`);
    }
  }
}

console.log(`\nOutput: ${outputDir}/`);

function extractMermaidBlocks(md, fileBase) {
  const headingRegex = /^##\s+(.+)$/gm;
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

  const headings = [];
  let m;
  while ((m = headingRegex.exec(md)) !== null) {
    headings.push({ title: m[1], index: m.index });
  }

  const blocks = [];
  let i = 0;
  while ((m = mermaidRegex.exec(md)) !== null) {
    const preceding = headings.filter((h) => h.index < m.index).pop();
    const title = preceding ? preceding.title : `diagram-${++i}`;
    const slug = `${fileBase}--${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    blocks.push({ slug, content: m[1] });
  }
  return blocks;
}
