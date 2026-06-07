using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using PresignApp.Models;
using PresignApp.Services;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var builder = WebApplication.CreateBuilder(args);

// Hard-wire port 3000 to match the TypeScript reference implementation so
// frontend / Playwright tests can use the same base URL across all languages.
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
// Bind loopback only (127.0.0.1) to avoid the Windows firewall prompt and to
// stay in sync with the Go implementation; override the host via HOST if needed.
var host = Environment.GetEnvironmentVariable("HOST") ?? "127.0.0.1";
builder.WebHost.UseUrls($"http://{host}:{port}");

// Read S3/MinIO credentials from environment — same var names as the TS config.
var s3Cfg = new S3Config();

// Register services
builder.Services.AddSingleton(s3Cfg);
builder.Services.AddSingleton<S3Service>();

// CORS — open policy matches app.enableCors() in the NestJS bootstrap.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// JSON serialisation: use camelCase to produce the same JSON field names as TS.
builder.Services.ConfigureHttpJsonOptions(opts =>
{
    opts.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var app = builder.Build();

app.UseCors();

// ---------------------------------------------------------------------------
// Routes — mirror presign.controller.ts exactly
// ---------------------------------------------------------------------------

// POST /presign/put
// Body:   { filename, contentType }
// 200:    { key, url, method:"PUT", expiresInSeconds, filename }
app.MapPost("/presign/put", (PresignPutRequest body, S3Service s3) =>
{
    // Validate required fields — returns 400 if either is missing/empty.
    if (string.IsNullOrWhiteSpace(body.Filename) || string.IsNullOrWhiteSpace(body.ContentType))
    {
        return Results.BadRequest(new { message = "filename and contentType are required" });
    }

    var result = s3.CreateUploadUrl(body.ContentType, body.Filename);

    // Return HTTP 200 with the presigned PUT info — matches TS 200 default.
    return Results.Ok(result);
});

// GET /presign/get/{key}
// 200:    { url, key, expiresInSeconds:300 }
// Note: the TS controller URL-decodes the key param before use.
app.MapGet("/presign/get/{*key}", (string key, S3Service s3) =>
{
    // URL-decode the path segment — matches decodeURIComponent(key) in TS.
    var decoded = Uri.UnescapeDataString(key);

    var url = s3.CreateDownloadUrl(decoded);

    var response = new PresignGetResponse
    {
        Url = url,
        Key = decoded,
        ExpiresInSeconds = 300,
    };

    return Results.Ok(response);
});

// Health / root endpoint
app.MapGet("/", () => "Presign Backend (C#)");

Console.WriteLine($"[bootstrap] backend listening on http://{host}:{port}");
app.Run();
