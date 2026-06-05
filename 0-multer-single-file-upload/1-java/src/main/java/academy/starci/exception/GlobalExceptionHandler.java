package academy.starci.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Maps framework exceptions to the HTTP responses specified in the TS contract:
 *
 * MaxUploadSizeExceededException (Spring maps spring.servlet.multipart.max-file-size)
 *   → 413 { statusCode: 413, message: "File too large" }
 *
 * ResponseStatusException(UNSUPPORTED_MEDIA_TYPE)
 *   → 415 { message: "Validation failed (expected MIME types: ...)" }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles file-too-large errors thrown by Spring's multipart resolver.
     * Returns 413 with { statusCode: 413, message: "File too large" } to match TS MulterExceptionFilter.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        // Match TS: { statusCode: 413, message: "File too large" }
        Map<String, Object> body = Map.of(
                "statusCode", 413,
                "message", "File too large"
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }

    /**
     * Handles 415 thrown by UploadController when MIME type is not in the allow-list.
     * Returns { message: "Validation failed (expected MIME types: ...)" } to match TS UnsupportedMediaTypeException.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        // Forward the reason phrase from the controller as { message: ... }
        Map<String, Object> body = Map.of("message", ex.getReason() != null ? ex.getReason() : ex.getMessage());
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }
}
