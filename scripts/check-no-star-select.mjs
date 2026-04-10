import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const scanRoots = ["app", "components", "features", "lib", "shared"];
const fileExtensions = new Set([".ts", ".tsx", ".mts"]);
const allowlist = new Set([
  "lib/services/comments.ts",
  "lib/services/simulator-payment-methods.ts",
  "lib/services/simulator-transactions.ts",
  "lib/trainee-alert-assignments.ts",
  "app/(protected)/users/[id]/page.tsx",
]);

const starSelectPattern = /\.select\(\s*["'`]\*["'`]/gs;

function walk(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!statSync(absoluteDir).isDirectory()) return [];

  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return walk(relativePath);
    }

    if (!fileExtensions.has(path.extname(entry.name))) {
      return [];
    }

    return [relativePath];
  });
}

const files = scanRoots
  .filter((dir) => {
    try {
      return statSync(path.join(rootDir, dir)).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((dir) => walk(dir));

const violations = [];
const staleAllowlist = [];

for (const relativePath of files) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const content = readFileSync(path.join(rootDir, relativePath), "utf8");
  const hasStarSelect = starSelectPattern.test(content);

  if (hasStarSelect && !allowlist.has(normalizedPath)) {
    violations.push(normalizedPath);
  }

  if (!hasStarSelect && allowlist.has(normalizedPath)) {
    staleAllowlist.push(normalizedPath);
  }
}

if (violations.length > 0) {
  console.error("Found undocumented .select(\"*\") usage:");
  for (const relativePath of violations) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

if (staleAllowlist.length > 0) {
  console.error("Allowlist entries no longer need .select(\"*\"):");
  for (const relativePath of staleAllowlist) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

console.log("No undocumented .select(\"*\") usage found.");
