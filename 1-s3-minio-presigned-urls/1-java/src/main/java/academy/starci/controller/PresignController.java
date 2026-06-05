package academy.starci.controller;

import academy.starci.dto.PresignGetResponse;
import academy.starci.dto.PresignPutRequest;
import academy.starci.dto.PresignPutResponse;
import academy.starci.service.S3Service;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * PresignController — HTTP endpoints to mint short-lived presigned PUT and GET URLs.
 *
 * Routes match the TypeScript PresignController exactly:
 *   POST /presign/put  → 200 { key, url, method, expiresInSeconds, filename }
 *   GET  /presign/get/:key → 200 { url, key, expiresInSeconds }
 */
@RestController
@RequestMapping("/presign")
public class PresignController {

    private final S3Service s3Service;

    public PresignController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    /**
     * Sign a short-lived PUT URL so the client uploads directly to MinIO/S3.
     * HTTP 200 is the default Spring status — matches the TS controller (no @HttpCode decorator).
     *
     * @param body { filename, contentType } — validated by @Valid
     * @return { key, url, method: "PUT", expiresInSeconds, filename }
     */
    @PostMapping("/put")
    public PresignPutResponse createPutUrl(@Valid @RequestBody PresignPutRequest body) {
        // Delegate key generation and presigning to S3Service
        S3Service.PresignedUploadResult result = s3Service.createUploadUrl(body.getContentType());

        // Merge service result with filename from request — same as TS: { ...info, filename: dto.filename }
        return new PresignPutResponse(
                result.key(),
                result.url(),
                "PUT",                       // method field — hardcoded "PUT" as in TS PresignedUploadInfo
                result.expiresInSeconds(),
                body.getFilename()
        );
    }

    /**
     * Sign a short-lived GET URL for download — bucket stays private.
     * The :key path segment is URL-decoded, mirroring TypeScript decodeURIComponent(key).
     * expiresInSeconds is hardcoded to 300 to match the TS controller literal.
     *
     * @param key URL-encoded object key from the path
     * @return { url, key, expiresInSeconds: 300 }
     */
    @GetMapping("/get/{key}")
    public PresignGetResponse createGetUrl(@PathVariable("key") String key) {
        // URL-decode the key — mirrors TypeScript: const decoded = decodeURIComponent(key)
        String decoded = URLDecoder.decode(key, StandardCharsets.UTF_8);

        String url = s3Service.createDownloadUrl(decoded);

        // expiresInSeconds hardcoded to 300 — matches the TS controller exactly
        return new PresignGetResponse(url, decoded, 300);
    }
}
