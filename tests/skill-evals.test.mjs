// Shape checks for evals/<skill>/scenarios.json run on every `bun test`.
// The live leg drives a real `claude -p` session per scenario and is skipped
// unless PSTACK_SKILL_EVALS=1, as tests/pi/live.test.mjs is unless
// PSTACK_PI_LIVE=1. See evals/README.md.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE = process.env.PSTACK_SKILL_EVALS === "1";
const MODEL = process.env.PSTACK_SKILL_EVALS_MODEL || "haiku";
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const pluginRoot = join(repoRoot, "plugins/pstack");
const evalsRoot = join(repoRoot, "evals");
const BLINDED = /\b(eval|test|judge|experiment|rubric|score|compare|benchmark|candidate|arena)/i;

const suites = readdirSync(evalsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => ({ name, dir: join(evalsRoot, name), spec: JSON.parse(readFileSync(join(evalsRoot, name, "scenarios.json"), "utf8")) }));

// Every Read path and tool name in a stream-json transcript.
export function toolUses(streamJson) {
  const uses = [];
  for (const line of streamJson.split("\n")) {
    if (!line.startsWith("{")) continue;
    const event = JSON.parse(line);
    for (const part of event.type === "assistant" ? event.message?.content ?? [] : []) {
      if (part.type === "tool_use") uses.push({ name: part.name, path: part.input?.file_path ?? "" });
    }
  }
  return uses;
}

test("at least one skill has scenarios", () => {
  expect(suites.length).toBeGreaterThan(0);
});

for (const { name, dir, spec } of suites) {
  describe(`evals/${name}`, () => {
    test("names skills that exist and a fixture directory", () => {
      expect(spec.skills).toContain(name);
      for (const skill of spec.skills) expect(existsSync(join(pluginRoot, "skills", skill, "SKILL.md"))).toBe(true);
      expect(existsSync(join(dir, spec.fixture))).toBe(true);
    });

    test("has at least three scenarios with unique ids", () => {
      expect(spec.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(new Set(spec.scenarios.map(({ id }) => id)).size).toBe(spec.scenarios.length);
    });

    for (const scenario of spec.scenarios) {
      test(`${scenario.id}: organic query, graded behavior, real files`, () => {
        expect(scenario.query).not.toMatch(BLINDED);
        expect(scenario.expected_behavior.length).toBeGreaterThan(0);
        expect(scenario.expect_reads?.length ?? 0).toBeGreaterThan(0);
        for (const path of [...scenario.expect_reads, ...(scenario.expect_no_reads ?? [])]) {
          expect(existsSync(join(pluginRoot, path)), path).toBe(true);
        }
      });
    }
  });
}

test("toolUses reads Read paths and tool names from stream-json", () => {
  const line = JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "/p/skills/poteto-mode/playbooks/bug-fix.md" } }] } });
  expect(toolUses(`${line}\nnot json\n`)).toEqual([{ name: "Read", path: "/p/skills/poteto-mode/playbooks/bug-fix.md" }]);
});

describe.skipIf(!LIVE)("live skill evals", () => {
  for (const { name, dir, spec } of suites) {
    for (const scenario of spec.scenarios) {
      test(`${name}/${scenario.id}`, () => {
        const work = mkdtempSync(join(tmpdir(), "pager-"));
        try {
          cpSync(join(dir, spec.fixture), work, { recursive: true });
          spawnSync("git", ["init", "-q"], { cwd: work });
          const run = spawnSync("claude", ["-p", "--plugin-dir", pluginRoot, "--model", MODEL, "--max-turns", "15", "--output-format", "stream-json", "--verbose", scenario.query], { cwd: work, encoding: "utf8", input: "", timeout: 10 * 60_000 });
          const uses = toolUses(run.stdout ?? "");
          const reads = uses.filter(({ name }) => name === "Read").map(({ path }) => path);
          const report = `${scenario.id}: read ${JSON.stringify(reads)}`;
          for (const path of scenario.expect_reads) expect(reads.some((read) => read.endsWith(path)), report).toBe(true);
          for (const path of scenario.expect_no_reads ?? []) expect(reads.some((read) => read.endsWith(path)), report).toBe(false);
          for (const tool of scenario.expect_no_tools ?? []) expect(uses.some(({ name }) => name === tool), report).toBe(false);
        } finally {
          rmSync(work, { recursive: true, force: true });
        }
      }, 11 * 60_000);
    }
  }
});
