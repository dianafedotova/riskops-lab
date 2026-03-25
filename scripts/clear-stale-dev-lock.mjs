/**
 * Removes `.next/dev/lock` when the recorded PID is no longer running
 * (e.g. after killing the terminal or a crash), so `next dev` can start again.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, ".next", "dev", "lock");

function main() {
  if (!fs.existsSync(lockPath)) return;

  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    return;
  }

  const pid = lock?.pid;
  if (typeof pid !== "number" || pid <= 0) return;

  try {
    process.kill(pid, 0);
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === "ESRCH") {
      try {
        fs.unlinkSync(lockPath);
        console.info(`[dev] Removed stale .next/dev/lock (process ${pid} is not running).`);
      } catch {
        /* ignore */
      }
    }
  }
}

main();
