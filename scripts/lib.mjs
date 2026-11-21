import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

export const isWin = process.platform === "win32";
export const npmCmd = isWin ? "npm.cmd" : "npm";

export function run(cmd, args, opts = {}) {
  const sh = isWin && cmd.endsWith(".cmd");
  const r = sh ? spawnSync([cmd, ...args].join(" "), { stdio: "inherit", shell: true, ...opts }) : spawnSync(cmd, args, { stdio: "inherit", ...opts });
  return r.status ?? 1;
}

export function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}

export function start(cmd, args, opts = {}) {
  const sh = isWin && cmd.endsWith(".cmd");
  const o = { stdio: "inherit", detached: !isWin, ...opts };
  return sh ? spawn([cmd, ...args].join(" "), { ...o, shell: true }) : spawn(cmd, args, o);
}

export function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  try {
    if (isWin) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {}
}

export async function waitFor(url, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
