package academy.starci;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the tus 1.0 resumable-upload server.
 * Listens on PORT (default 3370) — same as the TypeScript reference implementation.
 */
@SpringBootApplication
public class TusApplication {
    public static void main(String[] args) {
        SpringApplication.run(TusApplication.class, args);
    }
}
