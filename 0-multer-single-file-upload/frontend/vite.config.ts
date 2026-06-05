import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            // Proxy API requests to the NestJS backend so the FE can call /upload directly.
            "/upload": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
})
