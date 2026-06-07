package academy.starci.controller;

import academy.starci.config.UploadProperties;
import academy.starci.dto.UploadedFileInfo;
import academy.starci.service.UploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

/**
 * Handles POST /upload — mirrors the TS UploadController exactly.
 *
 * Route:   POST /upload
 * Field:   multipart field name "file"
 * Success: 201 UploadedFileInfo { originalName, filename, size, mimetype, path }
 * 413:     handled by GlobalExceptionHandler on MaxUploadSizeExceededException
 * 415:     thrown here when MIME is not in the allow-list
 */
@RestController
@RequestMapping("/upload")
public class UploadController {

    private final UploadService uploadService;
    private final UploadProperties uploadProperties;

    public UploadController(UploadService uploadService, UploadProperties uploadProperties) {
        this.uploadService = uploadService;
        this.uploadProperties = uploadProperties;
    }

    /**
     * Accepts one file via multipart/form-data.
     * MIME validation runs before saving — rejects with 415 if not in the allow-list.
     * Returns 201 + UploadedFileInfo on success.
     *
     * @param file the uploaded file bound to the "file" form field
     * @return 201 with file metadata
     */
    @PostMapping
    public ResponseEntity<UploadedFileInfo> upload(@RequestParam("file") MultipartFile file)
            throws IOException {

        // Validate MIME type against allow-list.
        // Mirrors TS: throw UnsupportedMediaTypeException when MIME is rejected.
        String contentType = file.getContentType();
        if (contentType == null || !uploadProperties.getAllowedMimes().contains(contentType)) {
            // Match TS message: "Validation failed (expected MIME types: image/jpeg, image/png, image/webp)"
            String allowed = String.join(", ", uploadProperties.getAllowedMimes());
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Validation failed (expected MIME types: " + allowed + ")"
            );
        }

        // Save file and return 201 with metadata.
        UploadedFileInfo info = uploadService.save(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(info);
    }
}
