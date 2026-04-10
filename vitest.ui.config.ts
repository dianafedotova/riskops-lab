import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/ui/**/*.{test,spec}.tsx"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["tests/ui/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
