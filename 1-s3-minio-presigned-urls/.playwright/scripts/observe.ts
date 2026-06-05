/**
 * observe() helper — pauses only in headed/debug mode; no-op in headless for fast CI.
 */
import type { Page } from "@playwright/test"

export async function observe(page: Page, _note?: string): Promise<void> {
    if (process.env.PWDEBUG === "1" || process.env.PLAYWRIGHT_HEADED === "1") {
        await page.pause()
    }
}
