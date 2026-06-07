package academy.starci.service;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Sidecar metadata written to &lt;id&gt;.json alongside the raw upload data file.
 * Field names match the TypeScript FileStore sidecar exactly so cross-lang tooling
 * can read either implementation's uploads directory.
 *
 * <p>Fields (all snake_case to mirror @tus/file-store sidecar schema):
 * <ul>
 *   <li>id            — UUID for this upload</li>
 *   <li>size          — declared Upload-Length in bytes</li>
 *   <li>offset        — bytes received so far</li>
 *   <li>metadata      — raw Upload-Metadata header value (base64 key-value pairs)</li>
 *   <li>creation_date — ISO-8601 timestamp when the upload was created</li>
 * </ul>
 */
public class UploadInfo {

    @JsonProperty("id")
    private String id;

    @JsonProperty("size")
    private long size;

    @JsonProperty("offset")
    private long offset;

    @JsonProperty("metadata")
    private String metadata;

    @JsonProperty("creation_date")
    private String creationDate;

    public UploadInfo() {}

    public UploadInfo(String id, long size, long offset, String metadata, String creationDate) {
        this.id = id;
        this.size = size;
        this.offset = offset;
        this.metadata = metadata;
        this.creationDate = creationDate;
    }

    // --- accessors ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public long getOffset() { return offset; }
    public void setOffset(long offset) { this.offset = offset; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public String getCreationDate() { return creationDate; }
    public void setCreationDate(String creationDate) { this.creationDate = creationDate; }
}
