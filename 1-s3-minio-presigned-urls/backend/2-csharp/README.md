# S3/MinIO Presigned URLs — C# implementation

Minimal ASP.NET Core 8 app that mints short-lived presigned PUT/GET URLs
against MinIO (or any S3-compatible store). Port and JSON contract are
identical to the TypeScript reference implementation.

## Run

```bash
dotnet run
# server starts on http://localhost:3000
```

Override defaults via environment variables before running:

```bash
export S3_ENDPOINT=http://localhost:9000
export S3_REGION=us-east-1
export S3_ACCESS_KEY=minioadmin
export S3_SECRET_KEY=minioadmin
export S3_BUCKET=uploads
export S3_FORCE_PATH_STYLE=true
export S3_PRESIGN_EXPIRES_SECONDS=300

dotnet run
```

## Endpoints

| Method | Path | Body / Params | 200 Response |
|--------|------|---------------|--------------|
| POST | `/presign/put` | `{ filename, contentType }` | `{ key, url, method:"PUT", expiresInSeconds, filename }` |
| GET | `/presign/get/:key` | path param `key` (URL-encoded OK) | `{ url, key, expiresInSeconds:300 }` |

## Prerequisites

- .NET 8 SDK
- A running MinIO instance (or real AWS S3) pointed to by `S3_ENDPOINT`
