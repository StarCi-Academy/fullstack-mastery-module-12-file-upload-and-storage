/**
 * Flow 1 — request a presigned PUT URL from the backend and upload a file
 * directly to MinIO.
 *
 * Prerequisites:
 *   - MinIO must be running on :9000 with bucket "uploads" and CORS configured
 *     to allow PUT from the browser origin (AllowedMethods=[PUT],
 *     AllowedOrigins=[*] or http://localhost:5173).
 *   - If MinIO is not running or CORS is not set, the upload step will fail
 *     with upload-status "error" and error-msg visible — the spec will fail.
 *
 * Note: in a CI environment without MinIO, skip this spec by setting
 * SKIP_MINIO_TESTS=1. The skip guard is at the top of the test.
 */
import { expect, test } from "@playwright/test"
import * as path from "path"
import { observe } from "./observe"

test.skip(
    process.env.SKIP_MINIO_TESTS === "1",
    "MinIO not available in this environment (SKIP_MINIO_TESTS=1)",
)

test("flow 1 — presign PUT + upload to MinIO", async ({ page }) => {
    await page.goto("/")

    // Page should render with status "idle" initially.
    await expect(page.getByTestId("upload-status")).toHaveText("idle", {
        timeout: 10_000,
    })
    await observe(page, "page loaded, status idle")

    // Attach a small test file via the file-input.
    const testFilePath = path.join(__dirname, "fixtures", "test-upload.txt")
    await page.getByTestId("file-input").setInputFiles(testFilePath)
    await observe(page, "file selected")

    // Click the upload button to start the full presigned flow.
    await page.getByTestId("upload-btn").click()
    await observe(page, "upload button clicked")

    // Wait for the upload to complete — status must become "success".
    // This assertion waits up to 30 s to account for MinIO round-trip.
    await expect(page.getByTestId("upload-status")).toHaveText("success", {
        timeout: 30_000,
    })
    await observe(page, "upload succeeded")

    // The presigned key must be visible after a successful upload.
    const keyEl = page.getByTestId("presign-key")
    await expect(keyEl).toBeVisible()
    const keyText = await keyEl.textContent()
    // Key format: <timestamp>-<UUID> e.g. "1717390000000-550e8400-e29b-41d4-a716-446655440000"
    expect(keyText).toMatch(/^\d+-[0-9a-f-]{36}$/)
    await observe(page, `presign key visible: ${keyText ?? ""}`)

    // The download link must have a non-empty href (presigned GET URL).
    const downloadLink = page.getByTestId("download-link")
    await expect(downloadLink).toBeVisible()
    const href = await downloadLink.getAttribute("href")
    expect(href).toBeTruthy()
    expect(href).toContain("X-Amz-Signature")
    await observe(page, "download link present with X-Amz-Signature")
})
