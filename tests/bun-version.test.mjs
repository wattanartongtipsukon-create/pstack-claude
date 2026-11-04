// `.bun-version` is the one place the CI Bun version lives. setup-bun reads it
// through `bun-version-file`, and when that file is missing or empty it falls
// back to package.json and then the latest release, so a typo would not fail CI.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const pinned = readFileSync(new URL(".bun-version", root), "utf8").trim();

test(".bun-version holds one exact release", () => {
  expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
});

test("every setup-bun step reads .bun-version and none pins its own", () => {
  const dir = new URL(".github/workflows/", root);
  const steps = readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .flatMap((name) =>
      Object.values(Bun.YAML.parse(readFileSync(new URL(name, dir), "utf8")).jobs ?? {}).flatMap((job) =>
        (job.steps ?? []).filter((step) => step.uses?.startsWith("oven-sh/setup-bun@")).map((step) => ({ name, with: step.with ?? {} })),
      ),
    );
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) expect(step).toEqual({ name: step.name, with: { "bun-version-file": ".bun-version" } });
});

test("the local Bun matches .bun-version, or says so", () => {
  if (Bun.version !== pinned) {
    console.warn(`warning: running bun ${Bun.version}; CI runs ${pinned} from .bun-version`);
  }
});
