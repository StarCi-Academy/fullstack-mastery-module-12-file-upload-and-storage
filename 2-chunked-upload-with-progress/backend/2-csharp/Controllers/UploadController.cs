using Microsoft.AspNetCore.Mvc;
using ChunkedUpload.Models;
using ChunkedUpload.Services;

namespace ChunkedUpload.Controllers;

/// <summary>
/// Chunked upload controller — init / status / patch chunk / finalize.
/// All routes live under /uploads to match the TypeScript NestJS controller.
/// </summary>
[ApiController]
[Route("uploads")]
public sealed class UploadController : ControllerBase
{
    private readonly UploadService _uploadService;

    public UploadController(UploadService uploadService)
    {
        _uploadService = uploadService;
    }

    /// <summary>
    /// POST /uploads/init
    /// Create a new session. Returns sessionId + totalChunks so the client can plan PATCHes.
    /// Status: 201 Created (matches TypeScript @HttpCode(201)).
    /// </summary>
    [HttpPost("init")]
    [ProducesResponseType(typeof(InitSessionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Init([FromBody] InitSessionRequest body)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var result = await _uploadService.InitSessionAsync(body.Filename, body.Size, body.ChunkSize);
            // Explicitly set 201 to match TypeScript @HttpCode(201)
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /uploads/:id/status
    /// Return status + bitmap so the client knows which chunks to skip on resume.
    /// Status: 200 OK.
    /// </summary>
    [HttpGet("{id}/status")]
    [ProducesResponseType(typeof(SessionStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Status([FromRoute] string id)
    {
        try
        {
            var result = _uploadService.GetStatus(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// PATCH /uploads/:id/chunks?index=N
    /// Receive raw binary body for chunk N and persist it as tmp/&lt;id&gt;/&lt;N&gt;.part.
    /// Body parser is disabled for this route via [DisableRequestSizeLimit] + manual stream read
    /// so that raw bytes are preserved (same approach as TypeScript bodyParser:false + readBody).
    /// Status: 204 No Content (matches TypeScript @HttpCode(204)).
    /// </summary>
    [HttpPatch("{id}/chunks")]
    [DisableRequestSizeLimit]
    [Consumes("application/octet-stream")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PatchChunk(
        [FromRoute] string id,
        [FromQuery] int index)
    {
        // Read raw body bytes directly from the request stream (equivalent to TS readBody)
        using var memStream = new MemoryStream();
        await Request.Body.CopyToAsync(memStream);
        var buffer = memStream.ToArray();

        try
        {
            await _uploadService.WriteChunkAsync(id, index, buffer);
            // Return 204 to match TypeScript @HttpCode(204)
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /uploads/:id/finalize
    /// Merge every chunk in order, compute SHA-256, clean up tmp folder.
    /// Status: 200 OK (matches TypeScript @HttpCode(200)).
    /// </summary>
    [HttpPost("{id}/finalize")]
    [ProducesResponseType(typeof(FinalizeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Finalize([FromRoute] string id)
    {
        try
        {
            var result = await _uploadService.FinalizeAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
