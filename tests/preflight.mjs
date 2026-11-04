// Fails the run up front, with the fix, when the copy of Pi the tests load
// is missing. Without it, every Pi test errors with "Cannot find module".
import { fileURLToPath } from "node:url";

const extensionDir = fileURLToPath(new URL("../plugins/pstack/pi/", import.meta.url));
try {
  Bun.resolveSync("@earendil-works/pi-coding-agent", extensionDir);
} catch {
  console.error(
    "pstack tests need the copy of Pi in plugins/. Run:\n  bun install --frozen-lockfile --cwd plugins\n(see CONTRIBUTING.md, \"Before you open a PR\")",
  );
  process.exit(1);
}
