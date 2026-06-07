# Chunked Upload with Progress — Go

Pure stdlib implementation (`net/http`, `crypto/sha256`). No external dependencies.

## Run

```bash
go run .
# or
go build -o server . && ./server
```

Server starts on **port 3000** by default (same as the TypeScript reference).

## Environment variables

| Variable                 | Default    | Description                   |
|--------------------------|------------|-------------------------------|
| `PORT`                   | `3000`     | HTTP listen port              |
| `UPLOAD_TMP_DIR`         | `tmp`      | Staging directory for chunks  |
| `UPLOAD_FINAL_DIR`       | `uploads`  | Destination for merged files  |
| `UPLOAD_CHUNK_SIZE_BYTES`| `5242880`  | Default chunk size (5 MB)     |
| `UPLOAD_MAX_FILE_BYTES`  | `1073741824`| Max accepted file size (1 GB)|

## Routes

| Method | Path                          | Status | Description              |
|--------|-------------------------------|--------|--------------------------|
| POST   | `/uploads/init`               | 201    | Create upload session    |
| PATCH  | `/uploads/:id/chunks?index=N` | 204    | Upload a single chunk    |
| POST   | `/uploads/:id/finalize`       | 200    | Merge + SHA-256 + cleanup|
| GET    | `/uploads/:id/status`         | 200    | Progress bitmap          |
