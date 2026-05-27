// Flow 1 — pick a file, start tus upload, expect status=done + 100% chip.
// (EN: Flow 1 — pick a file, start tus upload, expect status=done + 100% chip.)
import { test, expect } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("flow-1: tus upload completes to 100% with status=done", async ({ page }) => {
  // Tạo file 2MB tạm.
  // (EN: Create a temp 2MB file.)
  const dir = mkdtempSync(join(tmpdir(), "tus-up-"));
  const filePath = join(dir, "test.bin");
  writeFileSync(filePath, Buffer.alloc(2_000_000, 7));

  await page.goto("/");
  await expect(page.getByTestId("home-title")).toBeVisible();
  await page.getByTestId("input-file").setInputFiles(filePath);
  await expect(page.getByTestId("btn-pick")).toContainText("test.bin");
  await page.getByTestId("btn-start").click();

  // Đợi chip status = done.
  // (EN: Wait until status chip reads "done".)
  await expect(page.getByTestId("chip-status")).toHaveText("done", { timeout: 30_000 });
  await expect(page.getByTestId("chip-percent")).toHaveText("100%");
  const log = await page.getByTestId("log").innerText();
  expect(log).toContain("SUCCESS uploadUrl=");
});
