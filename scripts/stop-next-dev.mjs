/**
 * Stops the Next.js dev server that wrote `.next/dev/lock` (same project).
 * Use when you see: "Another next dev server is already running".
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, ".next", "dev", "lock");

function main() {
  if (!fs.existsSync(lockPath)) {
    console.info("No .next/dev/lock — no dev server registered for this project.");
    return;
  }

  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    console.warn("Could not read .next/dev/lock; remove it manually if dev will not start.");
    return;
  }

  const pid = lock?.pid;
  if (typeof pid !== "number" || pid <= 0) {
    console.warn("Lock file has no valid pid.");
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/F", "/T"], { stdio: "inherit", shell: false });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }

  try {
    fs.unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
}

main();
