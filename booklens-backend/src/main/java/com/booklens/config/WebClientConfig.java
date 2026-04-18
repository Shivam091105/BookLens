package com.booklens.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * WebClientConfig
 *
 * Configures the shared {@link WebClient.Builder} bean used by OpenLibraryClient.
 *
 * Spring Boot auto-configures a WebClient.Builder but it has no connection timeouts,
 * no read/write timeouts, and a default codec buffer limit of 256KB — far too small
 * for Open Library's search responses, which can exceed 1MB.
 *
 * This config replaces the auto-configured builder with one that has:
 *  - Connection pool with keep-alive to reduce handshake overhead on repeated API calls
 *  - Connect timeout: 5 seconds
 *  - Read timeout: 10 seconds  (Open Library can be slow on cold requests)
 *  - Write timeout: 5 seconds
 *  - Max in-memory buffer: 8MB (covers large search + subject responses)
 *  - User-Agent header identifying this client
 *
 * OpenLibraryClient injects WebClient.Builder and calls .baseUrl(...).build()
 * per request — that is safe and correct with this configuration.
 */
@Configuration
public class WebClientConfig {

    private static final int MAX_BUFFER_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
    private static final int CONNECT_TIMEOUT_MS    = 5_000;
    private static final int READ_TIMEOUT_SEC      = 10;
    private static final int WRITE_TIMEOUT_SEC     = 5;

    @Bean
    public WebClient.Builder webClientBuilder() {

        // ── Connection pool ───────────────────────────────────────────────
        // Keep up to 50 connections alive for up to 45 seconds. This avoids
        // re-doing a TLS handshake on every Open Library API call.
        ConnectionProvider provider = ConnectionProvider.builder("booklens-pool")
                .maxConnections(50)
                .maxIdleTime(Duration.ofSeconds(45))
                .maxLifeTime(Duration.ofMinutes(5))
                .pendingAcquireTimeout(Duration.ofSeconds(10))
                .evictInBackground(Duration.ofSeconds(120))
                .build();

        // ── HTTP client with timeouts ─────────────────────────────────────
        HttpClient httpClient = HttpClient.create(provider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, CONNECT_TIMEOUT_MS)
                .responseTimeout(Duration.ofSeconds(READ_TIMEOUT_SEC))
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(READ_TIMEOUT_SEC,  TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(WRITE_TIMEOUT_SEC, TimeUnit.SECONDS))
                );

        // ── Codec configuration ───────────────────────────────────────────
        // Default limit is 256KB. Open Library /subjects/{subject}.json and
        // large search responses can easily exceed this — bump to 8MB.
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(MAX_BUFFER_SIZE_BYTES))
                .build();

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .defaultHeader("User-Agent",
                        "BookLens/1.0 (https://github.com/booklens; contact@booklens.app)");
    }
}