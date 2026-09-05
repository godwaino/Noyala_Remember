import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The real package throws unconditionally outside Next.js's own
      // webpack build (its whole job is a build-time guard) — no-op it
      // under Vitest so server-only modules stay unit-testable.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
