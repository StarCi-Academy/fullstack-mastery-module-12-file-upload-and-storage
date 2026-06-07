namespace PresignApp.Services;

/// <summary>
/// Strongly-typed wrapper around S3/MinIO env vars.
/// Env var names match the TypeScript s3.config.ts exactly.
/// </summary>
public class S3Config
{
    /// <summary>S3_ENDPOINT — full URL to the MinIO/S3 server (e.g. http://localhost:9000).</summary>
    public string Endpoint { get; init; }

    /// <summary>S3_REGION — AWS/MinIO region (e.g. us-east-1).</summary>
    public string Region { get; init; }

    /// <summary>S3_ACCESS_KEY — access key / username.</summary>
    public string AccessKey { get; init; }

    /// <summary>S3_SECRET_KEY — secret key / password.</summary>
    public string SecretKey { get; init; }

    /// <summary>S3_BUCKET — bucket name to store uploads in.</summary>
    public string Bucket { get; init; }

    /// <summary>S3_FORCE_PATH_STYLE — must be true for MinIO path-style addressing.</summary>
    public bool ForcePathStyle { get; init; }

    /// <summary>S3_PRESIGN_EXPIRES_SECONDS — TTL for presigned URLs.</summary>
    public int PresignExpiresSeconds { get; init; }

    /// <summary>
    /// Reads all fields from environment variables with the same names as the TS config.
    /// Falls back to safe defaults matching the TypeScript defaults.
    /// </summary>
    public S3Config()
    {
        Endpoint = Environment.GetEnvironmentVariable("S3_ENDPOINT") ?? "http://localhost:9000";
        Region = Environment.GetEnvironmentVariable("S3_REGION") ?? "us-east-1";
        AccessKey = Environment.GetEnvironmentVariable("S3_ACCESS_KEY") ?? "minioadmin";
        SecretKey = Environment.GetEnvironmentVariable("S3_SECRET_KEY") ?? "minioadmin";
        Bucket = Environment.GetEnvironmentVariable("S3_BUCKET") ?? "uploads";
        ForcePathStyle = (Environment.GetEnvironmentVariable("S3_FORCE_PATH_STYLE") ?? "true") == "true";
        PresignExpiresSeconds = int.TryParse(
            Environment.GetEnvironmentVariable("S3_PRESIGN_EXPIRES_SECONDS"), out var secs)
            ? secs
            : 300;
    }
}
