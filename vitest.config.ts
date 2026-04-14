import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/**/*.test.ts"],
    // Reset all mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },
});
