// A runtime mapping file over 100 lines opens with a Contents list of its
// sections, so an agent that previews it with `head` sees what it covers.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIMES } from "../tools/runtimes.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const anchor = (heading) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, "").replaceAll(" ", "-");

for (const runtime of RUNTIMES) {
  test(`${runtime.mapping} lists its sections in Contents when over 100 lines`, () => {
    const lines = readFileSync(join(repoRoot, runtime.tools), "utf8").split("\n");
    if (lines.length <= 100) return;
    const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
    expect(sections[0]).toBe("Contents");
    const start = lines.indexOf("## Contents") + 1;
    const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
    const entries = lines.slice(start, end).filter((line) => line.startsWith("- "));
    expect(entries).toEqual(sections.slice(1).map((s) => `- [${s}](#${anchor(s)})`));
  });
}
