# S3 MinIO Presigned URLs — Go

Go implementation of the presigned-URL backend. Parity with the TypeScript version: same routes, status codes, and JSON field names.

## Prerequisites

- Go 1.21+
- A running MinIO instance (or any S3-compatible endpoint)

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint URL |
| `S3_REGION` | `us-east-1` | AWS region (arbitrary for MinIO) |
| `S3_ACCESS_KEY` | `minioadmin` | Access key ID |
| `S3_SECRET_KEY` | `minioadmin` | Secret access key |
| `S3_BUCKET` | `uploads` | Target bucket name |
| `S3_FORCE_PATH_STYLE` | `true` | Use path-style addressing (required for MinIO) |
| `S3_PRESIGN_EXPIRES_SECONDS` | `300` | Presigned URL TTL in seconds |
| `PORT` | `3000` | HTTP listen port |

## Run

```bash
go mod download
go run .
```

Server starts on `http://localhost:3000` (or `PORT`).

## API

### POST /presign/put

Request body:
```json
{ "filename": "photo.jpg", "contentType": "image/jpeg" }
```

Response 200:
```json
{
  "key": "1717600000000-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "url": "http://localhost:9000/uploads/...",
  "method": "PUT",
  "expiresInSeconds": 300,
  "filename": "photo.jpg"
}
```

### GET /presign/get/:key

Response 200:
```json
{
  "url": "http://localhost:9000/uploads/...",
  "key": "1717600000000-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "expiresInSeconds": 300
}
```
