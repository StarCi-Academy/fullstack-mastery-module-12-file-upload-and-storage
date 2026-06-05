package academy.starci.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for the tus server — binds the `tus.*` keys from application.yml.
 * Env vars: TUS_PATH, TUS_DIRECTORY, TUS_MAX_SIZE (mirrors TypeScript tusConfig).
 */
@Component
@ConfigurationProperties(prefix = "tus")
public class TusProperties {

    /** URL path at which the tus endpoint is mounted (default: /files). */
    private String path = "/files";

    /** Filesystem directory used to store upload chunks and sidecar JSON files. */
    private String directory = "./uploads";

    /** Maximum allowed upload size in bytes (default: 100 MiB). */
    private long maxSize = 104_857_600L;

    // --- accessors ---

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }

    public long getMaxSize() {
        return maxSize;
    }

    public void setMaxSize(long maxSize) {
        this.maxSize = maxSize;
    }
}
