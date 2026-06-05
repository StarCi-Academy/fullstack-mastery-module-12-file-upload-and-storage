# Chunked Upload with Progress — Java (Spring Boot)

Spring Boot implementation of the chunked file upload backend.
Mirrors the TypeScript reference implementation (same routes, status codes, JSON field names, port).

## Run

```bash
./mvnw spring-boot:run
```

Server listens on **http://localhost:3000**

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `UPLOAD_TMP_DIR` | `tmp` | Directory for in-progress chunk parts |
| `UPLOAD_FINAL_DIR` | `uploads` | Directory for merged files |
| `UPLOAD_CHUNK_SIZE_BYTES` | `5242880` (5 MiB) | Default chunk size when client omits `chunkSize` |
| `UPLOAD_MAX_FILE_BYTES` | `1073741824` (1 GiB) | Maximum allowed file size |

## API (matches TypeScript contract exactly)

| Method | Path | Status | Description |
|---|---|---|---|
| POST | `/uploads/init` | 201 | Create session — body: `{filename, size, chunkSize?}` |
| PATCH | `/uploads/:id/chunks?index=N` | 204 | Upload raw chunk bytes |
| GET | `/uploads/:id/status` | 200 | Received/missing chunk bitmap |
| POST | `/uploads/:id/finalize` | 200 | Merge + SHA-256 + cleanup tmp |
