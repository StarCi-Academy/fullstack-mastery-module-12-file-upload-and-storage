using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.IO;
using System.Text.Json;
using KestrelServerOptions = Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions;

// ---------------------------------------------------------------------------
// Environment-driven configuration (mirrors TS uploadConfig).
// ---------------------------------------------------------------------------
var uploadDest = Environment.GetEnvironmentVariable("UPLOAD_DEST") ?? "uploads";
var uploadMaxBytes = long.Parse(
    Environment.GetEnvironmentVariable("UPLOAD_MAX_BYTES") ?? (5 * 1024 * 1024).ToString()
);
var uploadAllowedMimes = (
    Environment.GetEnvironmentVariable("UPLOAD_ALLOWED_MIMES") ?? "image/jpeg,image/png,image/webp"
)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// Ensure the upload directory exists at startup.
Directory.CreateDirectory(uploadDest);

var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";

var builder = WebApplication.CreateBuilder(args);

// Listen on the configured port (default 3000 — matches TS server).
builder.WebHost.UseUrls($"http://*:{port}");

// ---------------------------------------------------------------------------
// Enforce the multipart body size limit at Kestrel and FormOptions level.
// Requests exceeding uploadMaxBytes will cause a BadHttpRequestException /
// InvalidDataException that we catch below and convert to 413.
// ---------------------------------------------------------------------------
builder.Services.Configure<KestrelServerOptions>(options =>
{
    options.Limits.MaxRequestBodySize = uploadMaxBytes;
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = uploadMaxBytes;
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// POST /upload — accepts multipart/form-data with field named "file".
//
// Success  201  { originalName, filename, size, mimetype, path }
// Too large 413 { statusCode: 413, message: "File too large" }
// Bad MIME  415  { message: "Validation failed (expected MIME types: image/jpeg, image/png, image/webp)" }
// ---------------------------------------------------------------------------
app.MapPost("/upload", async (HttpRequest request) =>
{
    // Read the multipart form, catching size-limit violations from ASP.NET Core.
    IFormCollection form;
    try
    {
        form = await request.ReadFormAsync();
    }
    catch (Exception ex) when (
        ex is Microsoft.AspNetCore.Http.BadHttpRequestException ||
        ex is InvalidDataException ||
        (ex.InnerException is Microsoft.AspNetCore.Http.BadHttpRequestException) ||
        (ex.InnerException is InvalidDataException) ||
        ex.Message.Contains("limit", StringComparison.OrdinalIgnoreCase) ||
        ex.Message.Contains("Multipart body length limit", StringComparison.OrdinalIgnoreCase)
    )
    {
        // Size exceeded — mirror TS MulterExceptionFilter LIMIT_FILE_SIZE branch.
        return Results.Json(
            new { statusCode = 413, message = "File too large" },
            statusCode: StatusCodes.Status413PayloadTooLarge
        );
    }

    var file = form.Files.GetFile("file");

    // No file or MIME not in allow-list → 415, mirror TS controller 415 branch.
    if (file == null || !Array.Exists(uploadAllowedMimes, m => m == file.ContentType))
    {
        var allowedList = string.Join(", ", uploadAllowedMimes);
        return Results.Json(
            new { message = $"Validation failed (expected MIME types: {allowedList})" },
            statusCode: StatusCodes.Status415UnsupportedMediaType
        );
    }

    // Double-check length after form is parsed (guard against clients that bypass Kestrel limit).
    if (file.Length > uploadMaxBytes)
    {
        return Results.Json(
            new { statusCode = 413, message = "File too large" },
            statusCode: StatusCodes.Status413PayloadTooLarge
        );
    }

    // Build filename: <epochMillis>-<originalname>  (mirrors TS diskStorage filename fn).
    var epochMillis = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var filename = $"{epochMillis}-{file.FileName}";
    var filePath = Path.Combine(uploadDest, filename);

    // Write the file to disk.
    await using var stream = File.Create(filePath);
    await file.CopyToAsync(stream);

    var sizeKb = (int)Math.Round((double)file.Length / 1024);
    Console.WriteLine($"[Upload] saved {sizeKb} KB to {filePath}");

    // Return 201 with the metadata DTO — field names match TS UploadedFileInfo exactly.
    return Results.Json(
        new
        {
            originalName = file.FileName,
            filename = filename,
            size = file.Length,
            mimetype = file.ContentType,
            path = filePath,
        },
        statusCode: StatusCodes.Status201Created
    );
});

// Health / smoke-test root.
app.MapGet("/", () => "Single File Upload Backend (C#)");

Console.WriteLine($"[Bootstrap] App listening on http://localhost:{port}");
app.Run();
