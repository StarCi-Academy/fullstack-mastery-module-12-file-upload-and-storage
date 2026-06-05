package academy.starci.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

/**
 * CORS configuration — mirrors the TypeScript app.enableCors() call.
 * Exposes tus protocol headers so the browser client can read them.
 */
@Configuration
public class WebConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "HEAD", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        // Expose tus-specific response headers to the browser (mirrors TS exposedHeaders list).
        config.setExposedHeaders(List.of(
                "Upload-Offset",
                "Upload-Length",
                "Tus-Resumable",
                "Tus-Version",
                "Tus-Extension",
                "Tus-Max-Size",
                "Location",
                "Upload-Metadata"
        ));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
