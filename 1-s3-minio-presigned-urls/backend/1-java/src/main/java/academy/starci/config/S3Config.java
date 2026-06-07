package academy.starci.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Wires up the AWS SDK v2 {@link S3Client} and {@link S3Presigner} beans.
 * endpointOverride + pathStyleAccessEnabled are required for MinIO compatibility.
 */
@Configuration
@EnableConfigurationProperties(S3Properties.class)
public class S3Config {

    /**
     * S3Client bean — used for any future non-presign operations (e.g. createBucket).
     * The client itself is not used for presigning; S3Presigner is the correct API for that.
     */
    @Bean
    public S3Client s3Client(S3Properties props) {
        return S3Client.builder()
                .endpointOverride(URI.create(props.getEndpoint()))
                .region(Region.of(props.getRegion()))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())
                        )
                )
                // forcePathStyle = true is mandatory for MinIO; virtual-hosted style fails without a DNS entry
                .forcePathStyle(props.isForcePathStyle())
                .build();
    }

    /**
     * S3Presigner bean — signs PUT and GET URLs without making a real HTTP call.
     * Must share the same endpoint/credentials/region/pathStyle as S3Client.
     */
    @Bean
    public S3Presigner s3Presigner(S3Properties props) {
        return S3Presigner.builder()
                .endpointOverride(URI.create(props.getEndpoint()))
                .region(Region.of(props.getRegion()))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())
                        )
                )
                // Path-style required for MinIO; mirrors S3Client config
                .serviceConfiguration(
                        software.amazon.awssdk.services.s3.S3Configuration.builder()
                                .pathStyleAccessEnabled(props.isForcePathStyle())
                                .build()
                )
                .build();
    }
}
