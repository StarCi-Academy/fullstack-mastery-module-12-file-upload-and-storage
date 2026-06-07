# Java (Spring Boot) — contract-verified — DONE

- Lang: Java, `backend/1-java`
- Date: 2026-06-07
- Method: source contract-verify (per module instruction — Playwright runs against TS only; Java/C#/Go are contract-verified, all four implement the identical 4-endpoint contract + in-memory store + SHA-256 at finalize).

## Endpoints (`src/main/java/academy/starci/controller/UploadController.java`)

| Flow | Mapping | Status | Notes |
|------|---------|--------|-------|
| init | `@PostMapping("/init")` `@ResponseStatus(CREATED)` | 201 | `InitSessionResponse {sessionId,totalChunks,chunkSize}` |
| status | `@GetMapping("/{id}/status")` | 200 | `{sessionId,totalChunks,chunkSize,received,missing,finalized}` |
| chunk | `@PatchMapping("/{id}/chunks")` `@ResponseStatus(NO_CONTENT)` `@RequestParam("index")` | 204 | raw body via `request.getInputStream().readAllBytes()` |
| finalize | `@PostMapping("/{id}/finalize")` | 200 | `{filename,size,sha256,path}` |

- Base path `@RequestMapping("/uploads")`.
- In-memory session store (`ConcurrentHashMap`), SHA-256 computed at finalize (`MessageDigest`).
- Bind `127.0.0.1` (`application.yml: server.address: 127.0.0.1`).
- Contract is byte-identical to TS; same input bytes → same SHA-256 digest (the TS flow-1 anchor: `1f825aa2...` for bytes 0..9).
