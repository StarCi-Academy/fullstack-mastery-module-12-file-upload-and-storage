import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const BE_ORIGIN = "http://127.0.0.1:3410"

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Pin the dev port in source (not via CLI --port). Frontend runs on 3411.
        port: 3411,
        host: "127.0.0.1",
        proxy: {
            "/upload": {
                target: BE_ORIGIN,
                changeOrigin: true,
            },
        },
    },
})
