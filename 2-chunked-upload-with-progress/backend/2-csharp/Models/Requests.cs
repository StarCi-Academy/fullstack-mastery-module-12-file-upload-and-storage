using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ChunkedUpload.Models;

/// <summary>
/// Body of POST /uploads/init.
/// Mirrors the TypeScript InitSessionDto: filename + size required, chunkSize optional.
/// </summary>
public sealed class InitSessionRequest
{
    /// <summary>Display filename used to name the merged output file.</summary>
    [Required]
    [JsonPropertyName("filename")]
    public string Filename { get; set; } = string.Empty;

    /// <summary>Total file size in bytes; used to compute totalChunks.</summary>
    [Required]
    [Range(1, long.MaxValue)]
    [JsonPropertyName("size")]
    public long Size { get; set; }

    /// <summary>
    /// Optional client-requested chunk size in bytes.
    /// Defaults to UPLOAD_CHUNK_SIZE_BYTES env var (5 MB) when omitted or zero.
    /// </summary>
    [JsonPropertyName("chunkSize")]
    public long? ChunkSize { get; set; }
}
