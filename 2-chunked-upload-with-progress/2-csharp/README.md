# Chunked Upload with Progress — C# (ASP.NET Core)

Parity implementation of the TypeScript NestJS backend. All routes, status codes, and JSON field names are identical.

## Requirements

- .NET 8 SDK

## Run

```bash
dotnet run
# Listening on http://localhost:3000
```

Override defaults via env vars:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `UPLOAD_TMP_DIR` | `tmp` | Directory for in-progress chunk files |
| `UPLOAD_FINAL_DIR` | `uploads` | Directory for merged output files |
| `UPLOAD_CHUNK_SIZE_BYTES` | `5242880` (5 MB) | Default chunk size when client omits `chunkSize` |
| `UPLOAD_MAX_FILE_BYTES` | `1073741824` (1 GB) | Maximum allowed file size |

## API

| Method | Route | Status | Description |
|---|---|---|---|
| POST | `/uploads/init` | 201 | Create session |
| GET | `/uploads/:id/status` | 200 | Session status + chunk bitmap |
| PATCH | `/uploads/:id/chunks?index=N` | 204 | Upload raw chunk N |
| POST | `/uploads/:id/finalize` | 200 | Merge chunks + SHA-256 |
