/**
 * Flow 2 — tus pause + resume: start a larger upload, pause mid-way (the
 * client calls abort() — bytes already sent stay on the server), then click
 * Resume. The library HEADs /files/:id, reads Upload-Offset, and continues
 * PATCH from that byte. The upload must complete and show a result URL.
 *
 * A 6 MB file with 2 MB chunk size gives ~3 PATCH requests, making it
 * realistic to pause mid-upload without timing issues.
 */
import { expect, test } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import { observe } from "./observe"

test("flow 2 — pause mid-upload then resume and complete", async ({ page }) => {
    // Create a 6 MB temp file so we get multiple PATCH requests.
    const tmpDir = os.tmpdir()
    const filePath = path.join(tmpDir, "tus-flow2-test.bin")
    const buf = Buffer.alloc(6 * 1024 * 1024, 0xcd)
    fs.writeFileSync(filePath, buf)

    await page.goto("/")
    await observe(page, "page loaded")

    // Attach file.
    await page.getByTestId("file-input").setInputFiles(filePath)

    // Start upload.
    await page.getByTestId("start-btn").click()
    await observe(page, "upload started")

    // Wait briefly then pause — status should transition to "paused".
    await page.waitForTimeout(400)
    await page.getByTestId("pause-btn").click()

    await expect(page.getByTestId("upload-status")).toContainText("paused", {
        timeout: 10_000,
    })
    await observe(page, "upload paused")

    // Resume — the library finds the fingerprint in localStorage, HEADs the
    // server for Upload-Offset, and continues PATCH from where it left off.
    await page.getByTestId("resume-btn").click()
    await observe(page, "upload resumed")

    // Wait for done status (upload should complete now).
    await expect(page.getByTestId("upload-status")).toContainText("done", {
        timeout: 30_000,
    })
    await observe(page, "upload done after resume")

    // Result URL must be present.
    const result = page.getByTestId("result")
    await expect(result).toBeVisible()
    await expect(result).toContainText("/files/")

    // Cleanup temp file.
    fs.unlinkSync(filePath)
})
