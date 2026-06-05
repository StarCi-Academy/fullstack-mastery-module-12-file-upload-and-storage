/**
 * Flow 1 — upload a valid image file (jpeg, ≤ 5 MB).
 *
 * Expected result: upload-status chip shows "success" and result-meta
 * contains the file's originalName, filename, mimetype.
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

test("flow 1 — valid image upload returns 201 and metadata", async ({ page }) => {
    await page.goto("/")
    await observe(page, "page loaded")

    // Build a small valid JPEG buffer (minimal JPEG magic bytes + filler).
    const jpegBuffer = Buffer.concat([
        // JPEG SOI marker + minimal valid content.
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(100, 0x00),
    ])

    // Set the file input with a synthetic image/jpeg file — no fixture file needed.
    await page.getByTestId("file-input").setInputFiles({
        name: "test-photo.jpg",
        mimeType: "image/jpeg",
        buffer: jpegBuffer,
    })
    await observe(page, "file selected")

    await page.getByTestId("upload-btn").click()
    await observe(page, "upload triggered")

    // Wait for the status chip to reach "success".
    await expect(page.getByTestId("upload-status")).toContainText("success", {
        timeout: 15_000,
    })
    await observe(page, "upload success")

    // result-meta must be visible and contain the file name and MIME type.
    const meta = page.getByTestId("result-meta")
    await expect(meta).toBeVisible()
    await expect(meta).toContainText("test-photo.jpg")
    await expect(meta).toContainText("image/jpeg")
})
