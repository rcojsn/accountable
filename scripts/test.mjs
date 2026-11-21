import { npmCmd, run } from "./lib.mjs";

const steps = [
  ["Frontend unit tests (Vitest)", npmCmd, ["run", "test:web"]],
  ["Backend unit tests (pytest)", "uv", ["run", "pytest", "-q"]],
  ["End-to-end tests (Playwright)", npmCmd, ["run", "test:e2e"]],
];
for (const [name, cmd, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const code = run(cmd, args);
  if (code !== 0) {
    console.error(`\n${name} failed.`);
    process.exit(code);
  }
}
console.log("\nAll test suites passed.");
