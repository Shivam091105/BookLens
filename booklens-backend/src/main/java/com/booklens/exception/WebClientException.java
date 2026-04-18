package com.booklens.exception;

import org.springframework.http.HttpStatus;

/**
 * WebClientException
 *
 * Typed exception for HTTP client errors that occur when calling external APIs
 * (primarily the Open Library API via OpenLibraryClient).
 *
 * Wraps Spring's {@link org.springframework.web.reactive.function.client.WebClientResponseException}
 * into the BookLens exception hierarchy so that:
 *  1. GlobalExceptionHandler can catch and respond to them uniformly.
 *  2. Service-layer callers don't need to import WebFlux types directly.
 *  3. Errors carry both a human-readable message and an HTTP status code.
 *
 * Usage in OpenLibraryClient:
 * <pre>
 *   } catch (WebClientResponseException e) {
 *       throw new WebClientException(
 *           "Open Library API error: " + e.getStatusCode(),
 *           HttpStatus.BAD_GATEWAY
 *       );
 *   }
 * </pre>
 *
 * Common status codes used:
 *  - 502 BAD_GATEWAY      — external API returned an error response
 *  - 504 GATEWAY_TIMEOUT  — external API timed out
 *  - 503 SERVICE_UNAVAILABLE — external API is unreachable
 */
public class WebClientException extends BookLensException {

    /**
     * @param message human-readable description of the error
     * @param status  HTTP status to return to the calling client
     */
    public WebClientException(String message, HttpStatus status) {
        super(message, status);
    }

    /**
     * Convenience constructor for timeout errors.
     */
    public static WebClientException timeout(String apiName) {
        return new WebClientException(
                apiName + " is taking too long to respond. Please try again.",
                HttpStatus.GATEWAY_TIMEOUT
        );
    }

    /**
     * Convenience constructor for unavailable external service.
     */
    public static WebClientException unavailable(String apiName) {
        return new WebClientException(
                apiName + " is currently unavailable. Please try again later.",
                HttpStatus.SERVICE_UNAVAILABLE
        );
    }

    /**
     * Convenience constructor for when a resource is not found in the external API.
     */
    public static WebClientException notFound(String resource) {
        return new WebClientException(
                resource + " was not found.",
                HttpStatus.NOT_FOUND
        );
    }
}