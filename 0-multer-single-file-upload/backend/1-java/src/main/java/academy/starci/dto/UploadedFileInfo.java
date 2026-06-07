package academy.starci.dto;

/**
 * Response body returned to the client after a successful upload.
 * Field names match the TS UploadedFileInfo interface exactly:
 * originalName, filename, size, mimetype, path.
 */
public class UploadedFileInfo {

    /** Original filename as supplied by the client. */
    private String originalName;

    /** Stored filename on disk — format: <epochMillis>-<originalName>. */
    private String filename;

    /** File size in bytes. */
    private long size;

    /** MIME type reported by the client / detected by the server. */
    private String mimetype;

    /** Relative path where the file was stored, e.g. uploads/1717000000000-photo.jpg. */
    private String path;

    public UploadedFileInfo() {}

    public UploadedFileInfo(String originalName, String filename, long size,
                            String mimetype, String path) {
        this.originalName = originalName;
        this.filename = filename;
        this.size = size;
        this.mimetype = mimetype;
        this.path = path;
    }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public String getMimetype() { return mimetype; }
    public void setMimetype(String mimetype) { this.mimetype = mimetype; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
}
