/**
 * Flow 3 — upload a file whose MIME type is outside the allow-list.
 *
 * Expected result: upload-status chip shows "error" and error-msg contains
 * "415" (the HTTP status code) verifying the fileFilter silent-reject + controller
 * UnsupportedMediaTypeException path.
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

test("flow 3 — wrong MIME type triggers 415 Unsupported Media Type", async ({ page }) => {
    await page.goto("/")
    await observe(page, "page loaded")

    // A plain-text file — MIME "text/plain" is outside the allow-list
    // (image/jpeg, image/png, image/webp).
    const textBuffer = Buffer.from("This is not an image", "utf-8")

    await page.getByTestId("file-input").setInputFiles({
        name: "fake.txt",
        mimeType: "text/plain",
        buffer: textBuffer,
    })
    await observe(page, "wrong-MIME file selected")

    await page.getByTestId("upload-btn").click()
    await observe(page, "upload triggered")

    // Status chip must show "error".
    await expect(page.getByTestId("upload-status")).toContainText("error", {
        timeout: 15_000,
    })
    await observe(page, "upload error received")

    // error-msg must contain "415".
    const errorEl = page.getByTestId("error-msg")
    await expect(errorEl).toBeVisible()
    await expect(errorEl).toContainText("415")
})
