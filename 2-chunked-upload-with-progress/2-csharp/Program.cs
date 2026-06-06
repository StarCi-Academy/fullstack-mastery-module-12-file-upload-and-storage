using ChunkedUpload.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Port — reads PORT env var to match TypeScript main.ts behaviour
// ---------------------------------------------------------------------------
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://*:{port}");

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
builder.Services.AddControllers();

// Register the upload service as a singleton so the in-memory session store
// survives across requests (same lifetime as the TypeScript Map<> singleton)
builder.Services.AddSingleton<UploadService>();

// CORS — mirrors app.enableCors() in the TypeScript bootstrap
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
var app = builder.Build();

app.UseCors();

// Disable the default request-size limit so large binary PATCH bodies are accepted.
// Individual controller actions use [DisableRequestSizeLimit] for fine-grained control,
// but the global middleware limit must also be removed to match the TypeScript
// bodyParser:false + express.json({ limit:"1mb" }) configuration.
app.Use(async (ctx, next) =>
{
    var feature = ctx.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
    if (feature != null) feature.MaxRequestBodySize = null;
    await next();
});

app.MapControllers();

app.MapGet("/", () => $"Chunked Upload Backend (C#) — listening on port {port}");

app.Run();
