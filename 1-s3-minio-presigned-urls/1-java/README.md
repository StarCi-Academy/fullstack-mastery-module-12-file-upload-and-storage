# s3-minio-presigned-urls — Java (Spring Boot)

Spring Boot port of the TypeScript presigned-URL lesson. Exposes two endpoints for minting short-lived S3/MinIO presigned PUT and GET URLs.

## Requirements

- Java 21
- A running MinIO instance (or any S3-compatible endpoint)

## Run

```bash
./mvnw spring-boot:run
```

Server starts on **port 3000**.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 base URL |
| `S3_REGION` | `us-east-1` | AWS region identifier |
| `S3_ACCESS_KEY` | `minioadmin` | Access key |
| `S3_SECRET_KEY` | `minioadmin` | Secret key |
| `S3_BUCKET` | `uploads` | Target bucket name |
| `S3_FORCE_PATH_STYLE` | `true` | Must be `true` for MinIO |
| `S3_PRESIGN_EXPIRES_SECONDS` | `300` | URL TTL in seconds |

## Endpoints

```
POST /presign/put
Body: { "filename": "photo.jpg", "contentType": "image/jpeg" }
→ 200 { "key": "...", "url": "...", "method": "PUT", "expiresInSeconds": 300, "filename": "photo.jpg" }

GET /presign/get/:key
→ 200 { "url": "...", "key": "...", "expiresInSeconds": 300 }
```
