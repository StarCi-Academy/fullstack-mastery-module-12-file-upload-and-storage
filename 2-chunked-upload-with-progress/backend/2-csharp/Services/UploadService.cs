using System.Collections.Concurrent;
using System.Security.Cryptography;
using ChunkedUpload.Models;

namespace ChunkedUpload.Services;

/// <summary>
/// Manages chunked upload sessions in memory and writes/reads chunk files to disk.
/// Sessions are stored in a ConcurrentDictionary (equivalent to TypeScript Map).
/// </summary>
public sealed class UploadService
{
    private readonly ILogger<UploadService> _logger;

    // Env-configured paths and limits
    private readonly string _tmpDir;
    private readonly string _finalDir;
    private readonly long _chunkSizeBytes;
    private readonly long _maxFileBytes;

    // In-memory session store — thread-safe equivalent of TypeScript Map<string, UploadSession>
    private readonly ConcurrentDictionary<string, UploadSession> _sessions = new();

    // Per-session lock objects so concurrent PATCH requests for the same session are serialized
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public UploadService(ILogger<UploadService> logger)
    {
        _logger = logger;

        _tmpDir = Environment.GetEnvironmentVariable("UPLOAD_TMP_DIR") ?? "tmp";
        _finalDir = Environment.GetEnvironmentVariable("UPLOAD_FINAL_DIR") ?? "uploads";
        _chunkSizeBytes = ParseEnvLong("UPLOAD_CHUNK_SIZE_BYTES", 5L * 1024 * 1024);
        _maxFileBytes = ParseEnvLong("UPLOAD_MAX_FILE_BYTES", 1024L * 1024 * 1024);
    }

    /// <summary>
    /// Create a new session. totalChunks = ceil(size / chunkSize).
    /// Immediately creates the tmp directory for this session.
    /// </summary>
    public async Task<InitSessionResponse> InitSessionAsync(string filename, long size, long? chunkSize)
    {
        if (size <= 0 || size > _maxFileBytes)
            throw new ArgumentOutOfRangeException(nameof(size), $"Invalid size: must be 1..{_maxFileBytes}");

        var effectiveChunkSize = chunkSize is > 0 ? chunkSize.Value : _chunkSizeBytes;
        var totalChunks = (int)Math.Ceiling((double)size / effectiveChunkSize);
        var id = Guid.NewGuid().ToString();

        var session = new UploadSession
        {
            Id = id,
            Filename = filename,
            Size = size,
            ChunkSize = effectiveChunkSize,
            TotalChunks = totalChunks,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Finalized = false,
        };

        _sessions[id] = session;
        _locks[id] = new SemaphoreSlim(1, 1);

        // Create the tmp directory eagerly so PATCH can write immediately
        Directory.CreateDirectory(Path.Combine(_tmpDir, id));

        _logger.LogInformation("init session {Id} total={Total}", id, totalChunks);
        return await Task.FromResult(new InitSessionResponse(id, totalChunks, effectiveChunkSize));
    }

    /// <summary>
    /// Write a single chunk to tmp/&lt;id&gt;/&lt;index&gt;.part.
    /// Idempotent — re-sending the same index overwrites the existing part file.
    /// </summary>
    public async Task WriteChunkAsync(string id, int index, byte[] buffer)
    {
        var session = RequireSession(id);

        if (index < 0 || index >= session.TotalChunks)
            throw new ArgumentOutOfRangeException(nameof(index),
                $"Chunk index {index} out of range [0, {session.TotalChunks})");

        var partPath = Path.Combine(_tmpDir, id, $"{index}.part");
        await File.WriteAllBytesAsync(partPath, buffer);

        // Serialize ReceivedChunks mutation to avoid race conditions between concurrent PATCHes
        var sem = _locks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
        await sem.WaitAsync();
        try
        {
            if (!session.ReceivedChunks.Contains(index))
            {
                session.ReceivedChunks.Add(index);
                session.ReceivedChunks.Sort();
            }
        }
        finally
        {
            sem.Release();
        }

        _logger.LogInformation("received chunk {Index}/{Total} ({Bytes}B)", index, session.TotalChunks, buffer.Length);
    }

    /// <summary>
    /// Return session status + bitmap so the client knows which chunks are still missing on resume.
    /// </summary>
    public SessionStatusResponse GetStatus(string id)
    {
        var session = RequireSession(id);

        List<int> received;
        List<int> missing = new();

        // Snapshot under lock to get a consistent view
        var sem = _locks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
        sem.Wait();
        try
        {
            received = new List<int>(session.ReceivedChunks);
        }
        finally
        {
            sem.Release();
        }

        for (var i = 0; i < session.TotalChunks; i++)
        {
            if (!received.Contains(i)) missing.Add(i);
        }

        return new SessionStatusResponse(
            session.Id,
            session.TotalChunks,
            session.ChunkSize,
            received,
            missing,
            session.Finalized
        );
    }

    /// <summary>
    /// Merge every chunk in order, compute SHA-256 in the same pass, then clean up tmp folder.
    /// Returns the merged file metadata matching the TypeScript FinalizeResponse shape.
    /// </summary>
    public async Task<FinalizeResponse> FinalizeAsync(string id)
    {
        var session = RequireSession(id);

        if (session.ReceivedChunks.Count != session.TotalChunks)
            throw new InvalidOperationException(
                $"Missing chunks: {session.TotalChunks - session.ReceivedChunks.Count}");

        Directory.CreateDirectory(_finalDir);

        var finalPath = Path.Combine(_finalDir, $"{id}-{session.Filename}");

        using var sha256 = SHA256.Create();
        long mergedSize = 0;

        // Stream-concatenate chunks in order and compute SHA-256 in the same pass
        await using (var outStream = new FileStream(finalPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            for (var i = 0; i < session.TotalChunks; i++)
            {
                var partPath = Path.Combine(_tmpDir, id, $"{i}.part");
                var partBytes = await File.ReadAllBytesAsync(partPath);

                sha256.TransformBlock(partBytes, 0, partBytes.Length, null, 0);
                mergedSize += partBytes.Length;

                await outStream.WriteAsync(partBytes);
            }

            sha256.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
        }

        // Clean up the tmp directory for this session
        var tmpSessionDir = Path.Combine(_tmpDir, id);
        if (Directory.Exists(tmpSessionDir))
            Directory.Delete(tmpSessionDir, recursive: true);

        session.Finalized = true;

        var hexHash = Convert.ToHexString(sha256.Hash!).ToLowerInvariant();
        _logger.LogInformation("finalized -> {Path}", finalPath);

        return new FinalizeResponse(session.Filename, mergedSize, hexHash, finalPath);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Throw 404-equivalent when the session does not exist.
    /// The controller maps KeyNotFoundException to 404.
    /// </summary>
    private UploadSession RequireSession(string id)
    {
        if (!_sessions.TryGetValue(id, out var session))
            throw new KeyNotFoundException($"Upload session {id} not found");
        return session;
    }

    /// <summary>Parse an environment variable as long; fall back to defaultValue on failure.</summary>
    private static long ParseEnvLong(string name, long defaultValue)
    {
        var raw = Environment.GetEnvironmentVariable(name);
        return long.TryParse(raw, out var v) && v > 0 ? v : defaultValue;
    }
}
