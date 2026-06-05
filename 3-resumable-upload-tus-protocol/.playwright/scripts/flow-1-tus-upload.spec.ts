/**
 * Flow 1 — full tus upload: pick a file, click Start, wait for done status and
 * a result URL. Verifies the happy-path: OPTIONS → POST → PATCH(s) → success.
 */
import { expect, test } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import { observe } from "./observe"

test("flow 1 — tus upload completes and shows result URL", async ({ page }) => {
    // Create a small temp file (512 KB) so the upload finishes quickly.
    const tmpDir = os.tmpdir()
    const filePath = path.join(tmpDir, "tus-flow1-test.bin")
    const buf = Buffer.alloc(512 * 1024, 0xab)
    fs.writeFileSync(filePath, buf)

    await page.goto("/")
    await observe(page, "page loaded")

    // Attach the file via the hidden <input type="file"> using setInputFiles.
    await page.getByTestId("file-input").setInputFiles(filePath)

    // Click Start — triggers tus OPTIONS → POST → PATCH loop.
    await page.getByTestId("start-btn").click()
    await observe(page, "upload started")

    // Wait for upload-status chip to show "done" (up to 30 s for slow machines).
    await expect(page.getByTestId("upload-status")).toContainText("done", {
        timeout: 30_000,
    })
    await observe(page, "upload done")

    // The result testid must now be visible and contain a URL pointing to /files/.
    const result = page.getByTestId("result")
    await expect(result).toBeVisible()
    await expect(result).toContainText("/files/")

    // Cleanup temp file.
    fs.unlinkSync(filePath)
})
