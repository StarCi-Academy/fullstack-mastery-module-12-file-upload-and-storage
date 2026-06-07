using System.Text.Json.Serialization;

namespace ChunkedUpload.Models;

/// <summary>
/// Response of POST /uploads/init (201).
/// Field names must match the TypeScript InitSessionResponse exactly.
/// </summary>
public sealed record InitSessionResponse(
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("totalChunks")] int TotalChunks,
    [property: JsonPropertyName("chunkSize")] long ChunkSize
);

/// <summary>
/// Response of GET /uploads/:id/status (200).
/// Field names must match the TypeScript SessionStatusResponse exactly.
/// </summary>
public sealed record SessionStatusResponse(
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("totalChunks")] int TotalChunks,
    [property: JsonPropertyName("chunkSize")] long ChunkSize,
    [property: JsonPropertyName("received")] List<int> Received,
    [property: JsonPropertyName("missing")] List<int> Missing,
    [property: JsonPropertyName("finalized")] bool Finalized
);

/// <summary>
/// Response of POST /uploads/:id/finalize (200).
/// Field names must match the TypeScript FinalizeResponse exactly.
/// </summary>
public sealed record FinalizeResponse(
    [property: JsonPropertyName("filename")] string Filename,
    [property: JsonPropertyName("size")] long Size,
    [property: JsonPropertyName("sha256")] string Sha256,
    [property: JsonPropertyName("path")] string Path
);
