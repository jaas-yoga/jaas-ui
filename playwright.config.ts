import { defineConfig, devices } from "@playwright/test";

/** IMPLEMENTATION_PLAN.md Phase 1.1. Deliberately no `webServer` block here:
 * the app needs a real jaas-registry backend AND a real jaas-guardrails
 * service alongside it (draft validate/publish call out to both), and
 * run.sh already owns exactly that three-process lifecycle for local dev.
 * Start the stack yourself first (`./run.sh start`) — see e2e/README.md —
 * CI does the same as an explicit step so it can also tear the stack down
 * afterward regardless of test outcome. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3027",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
