import { expect, test as setup } from "@playwright/test";

/** Runs once before the "chromium" project (playwright.config.ts's
 * `dependencies`), via the local-dev-only "Sign in with email" form
 * (src/app/login/page.tsx, auth.ts's "dev-login" Credentials provider) —
 * avoids a real Google OAuth round trip in CI entirely. Requires the
 * backend to have been started with JAAS_DEV_LOGIN_PASSWORD set (./run.sh
 * reads it from .env.local locally; CI exports it from a secret — see
 * e2e/README.md), and requires that same value here. */
const EMAIL = "owner@jaas.local";
const PASSWORD = process.env.JAAS_DEV_LOGIN_PASSWORD;

setup("authenticate as the seeded owner account", async ({ page }) => {
  if (!PASSWORD) {
    throw new Error(
      "JAAS_DEV_LOGIN_PASSWORD is not set in the environment running Playwright — " +
        "dev-login needs the same value the backend was started with. See e2e/README.md.",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in with email" }).click();

  await expect(page).toHaveURL("/skills");
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
