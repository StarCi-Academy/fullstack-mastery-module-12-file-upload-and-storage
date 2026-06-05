package academy.starci;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Application entry point — starts the embedded Tomcat server on port 3000.
 */
@SpringBootApplication
public class PresignedUrlsApplication {
    public static void main(String[] args) {
        SpringApplication.run(PresignedUrlsApplication.class, args);
    }
}
