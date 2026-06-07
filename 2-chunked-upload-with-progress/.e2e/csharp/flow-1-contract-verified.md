# C# (.NET) — contract-verified — DONE

- Lang: C#, `backend/2-csharp`
- Date: 2026-06-07
- Method: source contract-verify (Playwright runs TS only; C# verified from source — identical 4-endpoint contract + in-memory store + SHA-256 at finalize).

## Endpoints (`Controllers/UploadController.cs`)

| Flow | Attribute | Status | Notes |
|------|-----------|--------|-------|
| init | `[HttpPost("init")]` → `StatusCode(201)` | 201 | `InitSessionResponse` |
| status | `[HttpGet("{id}/status")]` | 200 | `{sessionId,totalChunks,chunkSize,received,missing,finalized}` |
| chunk | `[HttpPatch("{id}/chunks")]` `[FromQuery] int index` → `NoContent()` | 204 | raw body drained to buffer; `[ProducesResponseType(204)]` |
| finalize | `[HttpPost("{id}/finalize")]` | 200 | `{filename,size,sha256,path}` |

- Route prefix `/uploads`; in-memory store (`ConcurrentDictionary`), SHA-256 at finalize.
- `Program.cs`: `UseUrls("http://127.0.0.1:{port}")` + `feature.MaxRequestBodySize = null` (fixed during audit — was a non-existent method call).
- `Properties/launchSettings.json` `applicationUrl = http://127.0.0.1:3000`.
- Same contract + SHA-256 as TS → identical digest for identical bytes.
