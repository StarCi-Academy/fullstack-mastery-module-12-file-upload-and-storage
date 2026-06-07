namespace PresignApp.Models;

/// <summary>
/// Request body for POST /presign/put.
/// Mirrors PresignPutDto in the TypeScript reference implementation.
/// </summary>
public class PresignPutRequest
{
    /// <summary>Original display filename sent by the client.</summary>
    public string Filename { get; set; } = string.Empty;

    /// <summary>MIME type the client will use when uploading (e.g. image/png).</summary>
    public string ContentType { get; set; } = string.Empty;
}

/// <summary>
/// Response shape for POST /presign/put.
/// Field names must match the TypeScript PresignedUploadInfo + filename exactly.
/// </summary>
public class PresignPutResponse
{
    /// <summary>Object key in the bucket — format: &lt;epochMs&gt;-&lt;uuid&gt;</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Short-lived presigned PUT URL the client uploads to directly.</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>HTTP verb the client must use — always "PUT".</summary>
    public string Method { get; set; } = "PUT";

    /// <summary>TTL of the signed URL in seconds.</summary>
    public int ExpiresInSeconds { get; set; }

    /// <summary>Display filename echoed back from the request.</summary>
    public string Filename { get; set; } = string.Empty;
}

/// <summary>
/// Response shape for GET /presign/get/:key.
/// Field names must match the TypeScript controller return shape exactly.
/// </summary>
public class PresignGetResponse
{
    /// <summary>Short-lived presigned GET URL for downloading the object.</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Object key — URL-decoded value of the :key path param.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>TTL of the signed URL in seconds — hard-coded 300 to match TS.</summary>
    public int ExpiresInSeconds { get; set; } = 300;
}
