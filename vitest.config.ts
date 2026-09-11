import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import "dotenv/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
