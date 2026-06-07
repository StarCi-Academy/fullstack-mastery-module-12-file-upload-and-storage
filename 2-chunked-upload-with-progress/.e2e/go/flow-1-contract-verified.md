# Go (net/http) — contract-verified + router fix — DONE

- Lang: Go, `backend/3-go`
- Date: 2026-06-07
- Method: source contract-verify (Playwright runs TS only). Go is pure stdlib `net/http` + `map` + `sync.Mutex`, in-memory, SHA-256 at finalize — identical contract.

## Endpoints (`main.go`)

| Flow | Handler | Status | Notes |
|------|---------|--------|-------|
| init | `handleInit` (`MethodPost`) | 201 | `initSessionResponse {sessionId,totalChunks,chunkSize}` |
| status | `handleStatus` (`MethodGet`) | 200 | `{sessionId,totalChunks,chunkSize,received,missing,finalized}` |
| chunk | `handlePatchChunk` (`MethodPatch`) `?index=N` | 204 | raw body; `os.WriteFile(<tmp>/<id>/<N>.part)` |
| finalize | `handleFinalize` (`MethodPost`) | 200 | `{filename,size,sha256,path}` via `crypto/sha256` |

## Router off-by-one fix (applied during audit)

`extractPathSegment(r.URL.Path, 2)` returned the last segment ("chunks"/"finalize"/"status") instead of the session ID → every sub-route 404'd. Fixed to index `1` at lines 249 / 303 / 389:

```go
id := extractPathSegment(r.URL.Path, 1) // /uploads/<id>/chunks
```

- Bind `127.0.0.1:port` (line 509, avoids Windows Firewall popup).
- `go build` OK; prior live run (audit Apply round) produced SHA-256 = `e5b844cc...` matching TS/Java/C# for the same payload → cross-language parity confirmed. Same contract → same digest as the TS flow-1 anchor for identical bytes.
