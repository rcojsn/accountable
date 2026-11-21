import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { isWin, npmCmd, run, portFree, start, killTree, waitFor } from "./lib.mjs";

const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8000);
const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173);

if (!existsSync("node_modules") || !existsSync("frontend/node_modules/.bin") && !existsSync("node_modules/.bin/vite" + (isWin ? ".cmd" : ""))) {
  console.log("Installing npm packages...");
  if (run(npmCmd, ["install"]) !== 0) process.exit(1);
}
console.log("Syncing Python packages...");
if (run("uv", ["sync"]) !== 0) {
  console.error("uv sync failed. Is uv installed? See docs/STATUS.md.");
  process.exit(1);
}

for (const [name, port] of [["backend", apiPort], ["frontend", webPort]]) {
  if (!(await portFree(port))) {
    console.error(`Port ${port} is already in use, so the ${name} can't start. Stop whatever is using it, or set ACCOUNTABLE_${name === "backend" ? "API" : "WEB"}_PORT.`);
    process.exit(1);
  }
}

const env = { ...process.env, ACCOUNTABLE_API_PORT: String(apiPort) };
const backend = start("uv", ["run", "uvicorn", "accountable.main:app", "--host", "127.0.0.1", "--port", String(apiPort)], { env });
const frontend = start(npmCmd, ["run", "dev", "--workspace", "frontend", "--", "--port", String(webPort), "--strictPort", "--host", "127.0.0.1"], { env });

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  killTree(backend);
  killTree(frontend);
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
if (isWin) process.on("SIGBREAK", () => stop(0));
backend.on("exit", (c) => { if (!stopping) { console.error("Backend stopped."); stop(c ?? 1); } });
frontend.on("exit", (c) => { if (!stopping) { console.error("Frontend stopped."); stop(c ?? 1); } });

const url = `http://127.0.0.1:${webPort}/`;
const ok = (await waitFor(`http://127.0.0.1:${apiPort}/api/health`)) && (await waitFor(url));
if (!ok) { console.error("The app didn't start in time."); stop(1); }
else {
  console.log(`\nAccountable is running at ${url}  (Ctrl+C to stop)\n`);
  if (!process.env.ACCOUNTABLE_NO_BROWSER) {
    if (isWin) spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    else spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }
}
