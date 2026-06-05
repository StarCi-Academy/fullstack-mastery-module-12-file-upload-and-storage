/**
 * Flow 2 — upload a file that exceeds the 5 MB size limit.
 *
 * Expected result: upload-status chip shows "error" and error-msg contains
 * "413" (the HTTP status code) and "File too large" (MulterExceptionFilter message).
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

test("flow 2 — oversized file triggers 413 Payload Too Large", async ({ page }) => {
    await page.goto("/")
    await observe(page, "page loaded")

    // Create a buffer slightly over 5 MB (5 * 1024 * 1024 + 1 byte).
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0x00)

    // Declare as image/jpeg so the MIME allow-list does not reject it first —
    // we want to exercise the size limit path.
    await page.getByTestId("file-input").setInputFiles({
        name: "big-photo.jpg",
        mimeType: "image/jpeg",
        buffer: oversizedBuffer,
    })
    await observe(page, "oversized file selected")

    await page.getByTestId("upload-btn").click()
    await observe(page, "upload triggered")

    // Status chip must show "error".
    await expect(page.getByTestId("upload-status")).toContainText("error", {
        timeout: 30_000,
    })
    await observe(page, "upload error received")

    // error-msg must contain the status code and the backend message.
    const errorEl = page.getByTestId("error-msg")
    await expect(errorEl).toBeVisible()
    await expect(errorEl).toContainText("413")
    await expect(errorEl).toContainText("File too large")
})
