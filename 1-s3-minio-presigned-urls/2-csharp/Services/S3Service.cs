using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using PresignApp.Models;

namespace PresignApp.Services;

/// <summary>
/// Wraps AWSSDK.S3 (AmazonS3Client) to mint short-lived presigned PUT/GET URLs.
/// Mirrors the TypeScript S3Service logic exactly:
///   - key format: {epochMillis}-{guid}
///   - PUT URL signed for cfg.PresignExpiresSeconds
///   - GET URL TTL hard-coded to 300 s (matching TS controller)
/// </summary>
public class S3Service
{
    private readonly AmazonS3Client _client;
    private readonly S3Config _cfg;

    /// <summary>
    /// Constructs the service, building an AmazonS3Client from S3Config.
    /// ForcePathStyle and custom ServiceURL are required for MinIO compatibility.
    /// </summary>
    public S3Service(S3Config cfg)
    {
        _cfg = cfg;

        var s3Config = new AmazonS3Config
        {
            // Point SDK at MinIO instead of AWS — mirrors TS `endpoint` option.
            ServiceURL = cfg.Endpoint,
            // Path-style addressing required for MinIO (bucket in URL path, not subdomain).
            ForcePathStyle = cfg.ForcePathStyle,
            // Suppress the SDK's default AWS endpoint logic when using a custom ServiceURL.
            AuthenticationRegion = cfg.Region,
        };

        _client = new AmazonS3Client(cfg.AccessKey, cfg.SecretKey, s3Config);
    }

    /// <summary>
    /// Signs a short-lived PUT URL so the client can upload directly to MinIO/S3.
    /// Key format: {Date.Now().ms}-{Guid} — matches TypeScript `${Date.now()}-${randomUUID()}`.
    /// </summary>
    public PresignPutResponse CreateUploadUrl(string contentType, string filename)
    {
        // Build key: epoch-milliseconds + guid, identical to the TS implementation.
        var epochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var key = $"{epochMs}-{Guid.NewGuid()}";

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _cfg.Bucket,
            Key = key,
            Verb = HttpVerb.PUT,
            // Expires is an absolute DateTime; SDK calculates the TTL internally.
            Expires = DateTime.UtcNow.AddSeconds(_cfg.PresignExpiresSeconds),
            ContentType = contentType,
        };

        // GetPreSignedURL is synchronous in AWSSDK.S3 — no async variant needed here.
        var url = _client.GetPreSignedURL(request);

        return new PresignPutResponse
        {
            Key = key,
            Url = url,
            Method = "PUT",
            ExpiresInSeconds = _cfg.PresignExpiresSeconds,
            Filename = filename,
        };
    }

    /// <summary>
    /// Signs a short-lived GET URL for download.
    /// TTL is hard-coded to 300 s — matches the TypeScript controller return value.
    /// </summary>
    public string CreateDownloadUrl(string key)
    {
        const int getExpirySecs = 300;

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _cfg.Bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddSeconds(getExpirySecs),
        };

        return _client.GetPreSignedURL(request);
    }
}
