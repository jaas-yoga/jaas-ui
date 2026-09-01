import { expect, Page, test } from "@playwright/test";

/** Monaco auto-indents on every Enter keydown to match the previous line's
 * indentation — including when the newline arrives via keyboard.insertText,
 * not just .type(). That stacks with each line's own explicit leading
 * whitespace here, corrupting YAML indentation. Typing line-by-line and
 * selecting back to the start of line (Shift+Home) before each one clears
 * whatever Monaco auto-inserted, so insertText's own indentation is the only
 * indentation that lands. Assumes the editor already has focus/a cursor. */
async function typeIntoMonaco(page: Page, content: string) {
  const lines = content.split("\n");
  for (const [i, line] of lines.entries()) {
    if (i > 0) {
      await page.keyboard.press("Enter");
      await page.keyboard.press("Shift+Home");
    }
    await page.keyboard.insertText(line);
  }
}

/** IMPLEMENTATION_PLAN.md Phase 1.1: the draft/publish workspace's full
 * happy path, against a real backend + guardrails service (see
 * playwright.config.ts and e2e/README.md for how those get started).
 * Deliberately local-only (no GitHub repo linking) — that path is real but
 * needs a real connected repo to be meaningful, out of scope for this spec. */
test("create a local draft, edit it, validate, and publish", async ({ page }) => {
  const uniqueId = `e2e.test.summarizer-${Date.now()}`;

  await page.goto("/drafts");
  await page.getByRole("button", { name: "Create Skill", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page).toHaveURL(/\/drafts\/draft_/);

  // The starter manifest.yaml's placeholder id/entrypoint don't validate
  // as-is (INVALID_ID_FORMAT, and prompt.md doesn't exist yet). Delete it
  // and recreate it empty rather than trying to select-all-and-replace its
  // content in Monaco: Ctrl/Cmd+A reliably fails to reach Monaco's buffer
  // from Playwright's synthetic click+keypress here (content ends up
  // appended, not replaced) — recreating empty sidesteps that entirely.
  // The delete button is only visible on hover of its row (group-hover).
  await page.getByRole("button", { name: "manifest.yaml" }).hover();
  await page.getByRole("button", { name: "Delete manifest.yaml" }).click();
  await page.getByRole("button", { name: "New File" }).click();
  await page.getByPlaceholder("filename.yaml").fill("manifest.yaml");
  await page.keyboard.press("Enter");
  await expect(page.locator(".monaco-editor")).toBeVisible();

  await page.locator(".monaco-editor .view-lines").click();
  await typeIntoMonaco(
    page,
    [
      "apiVersion: v1",
      `id: ${uniqueId}`,
      "name: E2E Summarizer",
      "version: 1.0.0",
      "description: Created by the Playwright E2E happy-path spec.",
      "owner:",
      "  team: e2e",
      "entrypoint: prompt.md",
      "category: general",
      "tags: []",
      "runtime:",
      "  - family: prompt",
      '    versionRange: ">=1.0.0,<2.0.0"',
    ].join("\n"),
  );

  // Explicit "Save Draft" rather than waiting out the 1.5s autosave debounce
  // — exercises the same saveDraftFileAction path, just synchronously.
  await page.getByRole("button", { name: "Save Draft" }).click();

  await page.getByRole("button", { name: "New File" }).click();
  await page.getByPlaceholder("filename.yaml").fill("prompt.md");
  await page.keyboard.press("Enter");
  // Two "prompt.md" buttons exist once created (file tree entry + the newly
  // opened tab) — either is fine as proof the file exists.
  await expect(page.getByRole("button", { name: "prompt.md" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByText("Valid — ready to publish.")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Publish Skill" }).click();
  await page.getByRole("button", { name: "Publish Skill" }).last().click();

  await expect(page).toHaveURL(`/skills/${uniqueId}/versions/1.0.0`, { timeout: 15_000 });
});

test("delete draft flow removes it from the drafts list", async ({ page }) => {
  await page.goto("/drafts");
  await page.getByRole("button", { name: "Create Skill", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/drafts\/draft_/);
  const draftUrl = page.url();
  const draftId = draftUrl.split("/drafts/")[1];

  await page.getByRole("button", { name: "Delete Draft" }).click();
  await page.getByRole("button", { name: "Delete Draft" }).last().click();

  await expect(page).toHaveURL("/drafts");
  await expect(page.getByText(draftId, { exact: false })).toHaveCount(0);
});
