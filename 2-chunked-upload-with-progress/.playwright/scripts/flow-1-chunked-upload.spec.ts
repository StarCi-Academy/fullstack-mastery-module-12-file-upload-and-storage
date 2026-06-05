/**
 * Flow 1 — full chunked upload: init → PATCH all chunks → finalize → result-meta shows sha256 + path.
 *
 * Creates a buffer large enough to produce at least 2 chunks (default chunkSize = 5MB,
 * so 11MB → 3 chunks: 5MB + 5MB + 1MB). This exercises the per-chunk PATCH loop,
 * the overall progress reaching 100%, and the finalize response being rendered.
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

// 11MB → 3 chunks at default 5MB chunkSize (5+5+1)
const FILE_SIZE = 11 * 1024 * 1024

test("flow 1 — full chunked upload reaches 100% and shows result meta", async ({ page }) => {
    await page.goto("/")

    // Build an 11MB in-memory buffer to guarantee >= 2 PATCH requests.
    const buf = Buffer.alloc(FILE_SIZE, 42)

    await page.getByTestId("file-input").setInputFiles({
        name: "test-flow1.bin",
        mimeType: "application/octet-stream",
        buffer: buf,
    })
    await observe(page, "file selected")

    // Upload button should be enabled after file selection.
    await expect(page.getByTestId("upload-btn")).not.toBeDisabled()

    await page.getByTestId("upload-btn").click()
    await observe(page, "upload started")

    // Wait for status chip to show "done" (finalize completed).
    await expect(page.getByTestId("upload-status")).toHaveText("done", { timeout: 60_000 })
    await observe(page, "upload done")

    // Progress bar must report 100.
    await expect(page.getByTestId("progress")).toHaveAttribute("value", "100")

    // result-meta must be visible and contain sha256 + path from finalize response.
    const meta = page.getByTestId("result-meta")
    await expect(meta).toBeVisible()
    await expect(meta).toContainText("sha256:")
    await expect(meta).toContainText("path:")
})
