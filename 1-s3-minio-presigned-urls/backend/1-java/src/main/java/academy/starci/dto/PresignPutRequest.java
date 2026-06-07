package academy.starci.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /presign/put.
 * Field names mirror the TypeScript PresignPutDto exactly: filename + contentType.
 */
public class PresignPutRequest {

    /** Display name of the file — returned in the response as-is (mirrors TS dto.filename). */
    @NotBlank
    private String filename;

    /** MIME type that the client must set on the actual PUT request to MinIO. */
    @NotBlank
    private String contentType;

    // --- getters and setters ---

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
}
