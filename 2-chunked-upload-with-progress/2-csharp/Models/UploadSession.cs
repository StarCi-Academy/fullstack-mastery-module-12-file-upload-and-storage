namespace ChunkedUpload.Models;

/// <summary>
/// In-memory state of a single chunked upload session.
/// chunkSize and totalChunks are fixed at init; receivedChunks grows per PATCH.
/// </summary>
public sealed class UploadSession
{
    /// <summary>Session UUID — used as path segment in every follow-up request.</summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>Original filename supplied by the client at init.</summary>
    public string Filename { get; init; } = string.Empty;

    /// <summary>Total file size in bytes declared at init.</summary>
    public long Size { get; init; }

    /// <summary>Effective chunk size in bytes (either from request or server default).</summary>
    public long ChunkSize { get; init; }

    /// <summary>Total number of chunks = ceil(Size / ChunkSize).</summary>
    public int TotalChunks { get; init; }

    /// <summary>Sorted list of chunk indices that have been successfully written to disk.</summary>
    public List<int> ReceivedChunks { get; } = new();

    /// <summary>Unix timestamp (ms) when the session was created.</summary>
    public long CreatedAt { get; init; }

    /// <summary>True after POST /uploads/:id/finalize succeeds.</summary>
    public bool Finalized { get; set; }
}
