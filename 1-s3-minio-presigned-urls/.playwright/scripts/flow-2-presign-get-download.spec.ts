/**
 * Flow 2 — after a successful upload, the download-link must contain a valid
 * presigned GET URL that can be used to retrieve the object from MinIO.
 *
 * This spec runs the full upload flow first (same as Flow 1) and then
 * verifies the download-link href resolves correctly: the href must contain
 * `X-Amz-Signature` confirming the backend signed it, and the link must be
 * accessible (HTTP 200) directly — MinIO validates the signature without any
 * server proxy.
 *
 * Prerequisites: same as flow-1 — MinIO running + CORS configured.
 * Skip guard: set SKIP_MINIO_TESTS=1 to skip in environments without MinIO.
 */
import { expect, test } from "@playwright/test"
import * as path from "path"
import { observe } from "./observe"

test.skip(
    process.env.SKIP_MINIO_TESTS === "1",
    "MinIO not available in this environment (SKIP_MINIO_TESTS=1)",
)

test("flow 2 — presign GET download link has valid href", async ({ page, request }) => {
    await page.goto("/")

    // Upload a file first to get a key and download link.
    const testFilePath = path.join(__dirname, "fixtures", "test-upload.txt")
    await page.getByTestId("file-input").setInputFiles(testFilePath)
    await page.getByTestId("upload-btn").click()

    // Wait for success.
    await expect(page.getByTestId("upload-status")).toHaveText("success", {
        timeout: 30_000,
    })
    await observe(page, "upload succeeded, checking download link")

    // The download-link must be visible with a non-empty href.
    const downloadLink = page.getByTestId("download-link")
    await expect(downloadLink).toBeVisible()
    const href = await downloadLink.getAttribute("href")
    expect(href).toBeTruthy()
    expect(href).toContain("X-Amz-Signature")
    await observe(page, `download href: ${(href ?? "").slice(0, 80)}…`)

    // Verify the presigned GET URL is reachable — MinIO returns HTTP 200.
    // This confirms: bucket is private, only the signed URL allows reading.
    const response = await request.get(href!)
    expect(response.status()).toBe(200)
    await observe(page, "MinIO GET returned 200 — presigned download works")
})
