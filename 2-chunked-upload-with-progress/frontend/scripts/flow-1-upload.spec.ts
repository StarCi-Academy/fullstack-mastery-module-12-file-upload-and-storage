// Flow 1 — pick a file, start upload, expect overall progress 100% + finalize log.
// (EN: Flow 1 — pick a file, start upload, expect overall progress 100% + finalize log.)
import { test, expect } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("flow-1: chunked upload reaches 100% and finalizes", async ({ page }) => {
  // Tạo 1 file 1MB tạm để upload (chunk size mặc định = 5MB nên sẽ 1 chunk).
  // (EN: Create a temp 1MB file to upload — default chunk size is 5MB so this will be a single chunk.)
  const dir = mkdtempSync(join(tmpdir(), "chunked-up-"));
  const filePath = join(dir, "test.bin");
  writeFileSync(filePath, Buffer.alloc(1_000_000, 1));

  await page.goto("/");
  await expect(page.getByTestId("home-title")).toBeVisible();
  await page.getByTestId("input-file").setInputFiles(filePath);
  await expect(page.getByTestId("btn-pick")).toContainText("test.bin");
  await page.getByTestId("btn-start").click();

  // Đợi overall reach 100%.
  // (EN: Wait until overall reaches 100%.)
  await expect(page.getByTestId("chip-overall")).toHaveText("100%", { timeout: 30_000 });

  // Log phải chứa init + finalize.
  // (EN: Log must include init + finalize.)
  const log = await page.getByTestId("log").innerText();
  expect(log).toContain("[init] sessionId=");
  expect(log).toContain("[finalize] path=");
});
