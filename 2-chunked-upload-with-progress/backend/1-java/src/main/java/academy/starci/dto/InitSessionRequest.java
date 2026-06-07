package academy.starci.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /uploads/init.
 * Field names must match the TS InitSessionDto exactly: filename, size, chunkSize.
 */
public class InitSessionRequest {

    /** Display filename — must be non-empty string. */
    @NotBlank
    private String filename;

    /** Total file size in bytes — must be >= 1. */
    @NotNull
    @Min(1)
    private Long size;

    /** Optional client-side chunk size override in bytes — must be >= 1 when present. */
    @Min(1)
    private Long chunkSize;

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }

    public Long getChunkSize() { return chunkSize; }
    public void setChunkSize(Long chunkSize) { this.chunkSize = chunkSize; }
}
