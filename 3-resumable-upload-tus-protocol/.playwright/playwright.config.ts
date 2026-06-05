/**
 * Playwright config — tus resumable upload lesson.
 * Backend: NestJS tus server on port 3370.
 * Frontend: Vite dev server on FE_PORT (default 3371).
 */
import { defineConfig, devices } from "@playwright/test"

const FE_PORT = Number(process.env.FE_PORT ?? 3371)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${FE_PORT}`

export default defineConfig({
    testDir: "./scripts",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    use: {
        baseURL: BASE_URL,
        trace: "off",
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"], channel: "chrome" },
        },
    ],
    webServer: [
        {
            command: `npm run start:dev`,
            cwd: "../0-typescript",
            port: 3370,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: `npm run dev -- --port ${FE_PORT}`,
            cwd: "../frontend",
            port: FE_PORT,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
                VITE_API_BASE: `http://localhost:3370`,
            },
        },
    ],
})
