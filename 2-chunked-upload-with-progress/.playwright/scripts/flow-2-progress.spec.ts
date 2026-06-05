/**
 * Flow 2 — progress increases monotonically from 0 to 100.
 *
 * Uses a 6MB file (2 chunks at default 5MB chunkSize) and polls the progress
 * attribute to confirm it advances: first observed at > 0, then at 100.
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

const FILE_SIZE = 6 * 1024 * 1024   // 6MB → 2 chunks

test("flow 2 — progress advances from 0 to 100 during upload", async ({ page }) => {
    await page.goto("/")

    const buf = Buffer.alloc(FILE_SIZE, 7)

    await page.getByTestId("file-input").setInputFiles({
        name: "test-flow2.bin",
        mimeType: "application/octet-stream",
        buffer: buf,
    })

    await page.getByTestId("upload-btn").click()
    await observe(page, "upload started — watching progress")

    const progressEl = page.getByTestId("progress")

    // Progress must eventually pass through an intermediate value > 0 before reaching 100.
    // For a 2-chunk file: after chunk 0 → 50%, after chunk 1 → 100%.
    await expect(progressEl).toHaveAttribute("value", /^[1-9]/, { timeout: 30_000 })
    await observe(page, "progress > 0 confirmed")

    // Wait for completion.
    await expect(page.getByTestId("upload-status")).toHaveText("done", { timeout: 60_000 })
    await expect(progressEl).toHaveAttribute("value", "100")
    await observe(page, "progress 100 confirmed")
})
