/**
 * Flow 3 — resume: simulate an interrupted upload by directly calling the backend
 * to init + PATCH only the first chunk, then use the UI Resume button to finish.
 *
 * Strategy:
 *   1. Use `page.request` (Playwright built-in fetch) to init a session and PATCH
 *      only chunk 0 of a 2-chunk file (6MB total) — leaving chunk 1 in missing[].
 *   2. Navigate to the app, set the same file via setInputFiles.
 *   3. Paste the session ID into the session ID input.
 *   4. Click Resume — the UI GETs /status, sees missing=[1], PATCHes chunk 1, finalizes.
 *   5. Assert status="done" and result-meta is visible with sha256 + path.
 */
import { expect, test } from "@playwright/test"
import { observe } from "./observe"

// 6MB → 2 chunks at default 5MB chunkSize (5MB + 1MB)
const FILE_SIZE = 6 * 1024 * 1024
const BACKEND = process.env.VITE_API_BASE ?? "http://localhost:3000"

test("flow 3 — resume completes an interrupted upload from missing chunks", async ({ page }) => {
    // Step 1: init session via API and PATCH only chunk 0 (simulates partial upload).
    const buf = Buffer.alloc(FILE_SIZE, 99)

    const initRes = await page.request.post(`${BACKEND}/uploads/init`, {
        headers: { "Content-Type": "application/json" },
        data: { filename: "test-flow3.bin", size: FILE_SIZE },
    })
    expect(initRes.status()).toBe(201)
    const { sessionId, totalChunks, chunkSize } = (await initRes.json()) as {
        sessionId: string
        totalChunks: number
        chunkSize: number
    }
    expect(totalChunks).toBe(2)

    // PATCH only chunk 0 — leaves chunk 1 in missing[].
    const patchRes = await page.request.fetch(
        `${BACKEND}/uploads/${sessionId}/chunks?index=0`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/octet-stream" },
            data: buf.subarray(0, chunkSize),
        },
    )
    expect(patchRes.status()).toBe(204)
    await observe(page, "partial upload seeded — chunk 0 done, chunk 1 missing")

    // Step 2: open the UI.
    await page.goto("/")

    // Step 3: select the same file so the frontend can slice byte ranges on resume.
    await page.getByTestId("file-input").setInputFiles({
        name: "test-flow3.bin",
        mimeType: "application/octet-stream",
        buffer: buf,
    })

    // Step 4: paste the session ID into the session ID input field.
    const sessionInput = page.locator("input[placeholder='auto-filled after Upload']")
    await sessionInput.fill(sessionId)
    await observe(page, "session ID pasted — clicking Resume")

    // Step 5: click Resume.
    await expect(page.getByTestId("resume-btn")).not.toBeDisabled()
    await page.getByTestId("resume-btn").click()

    // Wait for done.
    await expect(page.getByTestId("upload-status")).toHaveText("done", { timeout: 60_000 })
    await observe(page, "resume done")

    // Final assertions.
    await expect(page.getByTestId("progress")).toHaveAttribute("value", "100")
    const meta = page.getByTestId("result-meta")
    await expect(meta).toBeVisible()
    await expect(meta).toContainText("sha256:")
    await expect(meta).toContainText("path:")
})
