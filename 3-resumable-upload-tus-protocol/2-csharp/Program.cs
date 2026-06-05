using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using tusdotnet;
using tusdotnet.Models;
using tusdotnet.Models.Configuration;
using tusdotnet.Stores;
using System;
using System.IO;

// ---------------------------------------------------------------------------
// Configuration — mirror TS env var names exactly for cross-lang parity
// ---------------------------------------------------------------------------

// PORT: default 3370 (same as TypeScript backend)
var port = Environment.GetEnvironmentVariable("PORT") ?? "3370";

// TUS_PATH: tus URL path prefix (TS default: "/files")
var tusPath = Environment.GetEnvironmentVariable("TUS_PATH") ?? "/files";

// TUS_DIRECTORY: local directory for stored uploads (TS default: "./uploads")
var tusDirectory = Environment.GetEnvironmentVariable("TUS_DIRECTORY") ?? "./uploads";

// TUS_MAX_SIZE: maximum upload size in bytes (TS default: 100 MiB = 104857600)
var tusMaxSizeEnv = Environment.GetEnvironmentVariable("TUS_MAX_SIZE") ?? "104857600";
var tusMaxSize = long.Parse(tusMaxSizeEnv);

// Ensure the upload directory exists before tusdotnet starts
Directory.CreateDirectory(tusDirectory);

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

var builder = WebApplication.CreateBuilder(args);

// Bind to the configured port on all interfaces (matches TS app.listen(port))
builder.WebHost.UseUrls($"http://*:{port}");

// CORS — expose all tus response headers so browser clients work directly
// (mirrors NestJS enableCors with preflightContinue: true + exposedHeaders)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
            .WithExposedHeaders(
                "Upload-Offset",
                "Upload-Length",
                "Tus-Resumable",
                "Tus-Version",
                "Tus-Extension",
                "Tus-Max-Size",
                "Location",
                "Upload-Metadata"
            );
    });
});

var app = builder.Build();

app.UseCors();

// ---------------------------------------------------------------------------
// tus 1.0 endpoint via tusdotnet
//
// Routes handled by tusdotnet (mirrors @tus/server behaviour):
//   OPTIONS  /files          -> 204  Tus-Resumable, Tus-Version, Tus-Extension(creation,termination)
//   POST     /files          -> 201  Location: /files/<id>
//   HEAD     /files/<id>     -> 200  Upload-Offset, Upload-Length
//   PATCH    /files/<id>     -> 204  Upload-Offset
//   DELETE   /files/<id>     -> 204  (termination extension)
// ---------------------------------------------------------------------------

app.UseTus(httpContext => new DefaultTusConfiguration
{
    // UrlPath must match TUS_PATH (default "/files") — same as TS `path: cfg.path`
    UrlPath = tusPath,

    // TusDiskStore persists uploads under tusDirectory — same as TS FileStore({ directory })
    Store = new TusDiskStore(tusDirectory),

    // MaxAllowedUploadSizeInBytes maps to TUS_MAX_SIZE — same as TS maxSize field
    MaxAllowedUploadSizeInBytes = tusMaxSize,

    Events = new Events
    {
        // Log when a new upload is created (mirrors NestJS Logger calls in tus.middleware.ts)
        OnFileCompleteAsync = async ctx =>
        {
            Console.WriteLine($"[tus] upload complete: {ctx.FileId}");
            await Task.CompletedTask;
        },
    },
});

// Health-check root route so `dotnet run` shows a recognisable response
app.MapGet("/", () => $"tus backend listening — upload at {tusPath}");

Console.WriteLine($"[bootstrap] tus backend listening on http://localhost:{port}");

app.Run();
