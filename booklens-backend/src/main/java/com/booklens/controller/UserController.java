//package com.booklens.controller;
//
//import com.booklens.books.BookApiService;
//import com.booklens.dto.book.BookDto;
//import com.booklens.exception.BookLensException;
//import com.booklens.repository.BookLogRepository;
//import com.booklens.repository.UserRepository;
//import com.booklens.service.UserService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.core.annotation.AuthenticationPrincipal;
//import org.springframework.security.core.userdetails.UserDetails;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//import java.util.Map;
//import java.util.stream.Collectors;
//
//@RestController
//@RequestMapping("/api/v1")
//@RequiredArgsConstructor
//public class UserController {
//
//    private final UserService        userService;
//    private final BookApiService     bookApiService;
//    private final BookLogRepository  bookLogRepository;
//    private final UserRepository     userRepository;
//
//    /**
//     * GET /api/v1/users/{username}
//     * Public profile view — no auth required.
//     */
//    @GetMapping("/users/{username}")
//    public ResponseEntity<Map<String, Object>> getProfile(
//            @PathVariable String username,
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        Long currentUserId = principal != null ? resolveUserId(principal) : null;
//        return ResponseEntity.ok(userService.getProfile(username, currentUserId));
//    }
//
//    /**
//     * PATCH /api/v1/me
//     * Update own profile. Requires auth.
//     */
//    @PatchMapping("/me")
//    public ResponseEntity<Map<String, Object>> updateProfile(
//            @RequestBody Map<String, Object> updates,
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        Long userId = resolveUserId(principal);
//        userService.updateProfile(userId, updates);
//        return ResponseEntity.ok(userService.getProfile(principal.getUsername(), userId));
//    }
//
//    /**
//     * POST /api/v1/users/{userId}/follow
//     */
//    @PostMapping("/users/{userId}/follow")
//    public ResponseEntity<Map<String, Object>> follow(
//            @PathVariable Long userId,
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        return ResponseEntity.ok(userService.follow(resolveUserId(principal), userId));
//    }
//
//    /**
//     * DELETE /api/v1/users/{userId}/follow
//     */
//    @DeleteMapping("/users/{userId}/follow")
//    public ResponseEntity<Map<String, Object>> unfollow(
//            @PathVariable Long userId,
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        return ResponseEntity.ok(userService.unfollow(resolveUserId(principal), userId));
//    }
//
//    /**
//     * GET /api/v1/me/suggestions?limit=4
//     * Suggested users to follow.
//     */
//    @GetMapping("/me/suggestions")
//    public ResponseEntity<?> getSuggestedUsers(
//            @RequestParam(defaultValue = "4") int limit,
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        return ResponseEntity.ok(userService.getSuggestedUsers(resolveUserId(principal), limit));
//    }
//
//    /**
//     * GET /api/v1/me/recommendations
//     *
//     * Seed strategy (all feeds the pool — updates on every log/rating/review):
//     *   Tier 1 — highly rated (≥3.5★): search by genre AND author
//     *   Tier 2 — any rated book:        search by genre
//     *   Tier 3 — currently reading:     search by genre
//     *   Tier 4 — any logged (unrated):  genre search as last resort
//     *
//     * Deduplicates against all logged books so user never sees something already read.
//     * Result is cached per-user in Redis; evicted by BookLogService and ReviewService.
//     */
//    @GetMapping("/me/recommendations")
//    public ResponseEntity<List<Map<String, Object>>> getRecommendations(
//            @AuthenticationPrincipal UserDetails principal
//    ) {
//        Long userId = resolveUserId(principal);
//
//        List<String> allLoggedIds      = bookLogRepository.findExternalBookIdsByUserId(userId);
//        List<String> highlyRatedIds    = bookLogRepository.findHighlyRatedExternalBookIdsByUserId(userId);
//        List<String> anyRatedIds       = bookLogRepository.findAnyRatedExternalBookIdsByUserId(userId);
//        List<String> currentlyReading  = bookLogRepository.findCurrentlyReadingExternalBookIdsByUserId(userId);
//
//        // Need at least one signal to generate recommendations
//        if (allLoggedIds.isEmpty()) {
//            return ResponseEntity.ok(List.of());
//        }
//
//        java.util.Set<String> seen = java.util.Collections.synchronizedSet(new java.util.LinkedHashSet<>());
//        List<Map<String, Object>> recs = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
//
//        // ── Tier 1: ALL highly-rated seeds → genre + author ──────────
//        // Removed .limit(3) — every highly-rated book now contributes its own pool.
//        // The global cap is raised to 60 so each new seed fully contributes.
//        for (String bookId : highlyRatedIds) {
//            if (recs.size() >= 60) break;
//            try {
//                BookDto seed = bookApiService.getBookDetail(bookId);
//                String seedTitle = seed.getTitle() != null ? seed.getTitle() : "a book you loved";
//
//                // By primary genre
//                if (seed.getGenres() != null && !seed.getGenres().isEmpty()) {
//                    addCandidates(recs, seen, allLoggedIds,
//                            seed.getGenres().get(0),
//                            "Similar to \u201c" + seedTitle + "\u201d", 6);
//                }
//                // By second genre (diversity)
//                if (seed.getGenres() != null && seed.getGenres().size() > 1) {
//                    addCandidates(recs, seen, allLoggedIds,
//                            seed.getGenres().get(1),
//                            "In the genre of \u201c" + seedTitle + "\u201d", 4);
//                }
//                // By author
//                if (seed.getAuthor() != null && !seed.getAuthor().isBlank()
//                        && !seed.getAuthor().equals("Unknown Author")) {
//                    addCandidates(recs, seen, allLoggedIds,
//                            seed.getAuthor(),
//                            "More by " + seed.getAuthor(), 4);
//                }
//            } catch (Exception ignored) {}
//        }
//
//        // ── Tier 2: any rated book (lower ratings still give signal) ──────
//        List<String> lowerRatedIds = anyRatedIds.stream()
//                .filter(id -> !highlyRatedIds.contains(id))
//                .collect(Collectors.toList());
//
//        for (String bookId : lowerRatedIds) {
//            if (recs.size() >= 60) break;
//            try {
//                BookDto seed = bookApiService.getBookDetail(bookId);
//                String seedTitle = seed.getTitle() != null ? seed.getTitle() : "your reading list";
//                if (seed.getGenres() != null && !seed.getGenres().isEmpty()) {
//                    addCandidates(recs, seen, allLoggedIds,
//                            seed.getGenres().get(0),
//                            "Because you rated \u201c" + seedTitle + "\u201d", 4);
//                }
//            } catch (Exception ignored) {}
//        }
//
//        // ── Tier 3: currently reading ──────────────────────────────────────────────
//        for (String bookId : currentlyReading) {
//            if (recs.size() >= 60) break;
//            try {
//                BookDto seed = bookApiService.getBookDetail(bookId);
//                String seedTitle = seed.getTitle() != null ? seed.getTitle() : "what you're reading";
//                if (seed.getGenres() != null && !seed.getGenres().isEmpty()) {
//                    addCandidates(recs, seen, allLoggedIds,
//                            seed.getGenres().get(0),
//                            "Because you're reading \u201c" + seedTitle + "\u201d", 4);
//                }
//            } catch (Exception ignored) {}
//        }
//
//        // ── Tier 4: unrated logged books as last resort ────────────────────────
//        if (recs.size() < 16) {
//            List<String> unratedIds = allLoggedIds.stream()
//                    .filter(id -> !anyRatedIds.contains(id) && !currentlyReading.contains(id))
//                    .collect(Collectors.toList());
//            for (String bookId : unratedIds) {
//                if (recs.size() >= 60) break;
//                try {
//                    BookDto seed = bookApiService.getBookDetail(bookId);
//                    String seedTitle = seed.getTitle() != null ? seed.getTitle() : "a book you logged";
//                    if (seed.getGenres() != null && !seed.getGenres().isEmpty()) {
//                        addCandidates(recs, seen, allLoggedIds,
//                                seed.getGenres().get(0),
//                                "Because you logged \u201c" + seedTitle + "\u201d", 3);
//                    }
//                } catch (Exception ignored) {}
//            }
//        }
//
//        // Return up to 24 recommendations (3 full rows of 8 on the front end)
//        return ResponseEntity.ok(recs.stream().limit(24).collect(Collectors.toList()));
//    }
//
//    private void addCandidates(
//            List<Map<String, Object>> recs,
//            java.util.Set<String> seen,
//            List<String> exclude,
//            String query,
//            String reason,
//            int limit
//    ) {
//        if (query == null || query.isBlank() || recs.size() >= 60) return;
//        try {
//            bookApiService.search(query, 0, 20).getBooks().stream()
//                    .filter(b -> b.getExternalId() != null
//                            && !exclude.contains(b.getExternalId())
//                            && seen.add(b.getExternalId()))
//                    .limit(limit)
//                    .forEach(b -> {
//                        if (recs.size() >= 60) return;
//                        java.util.Map<String, Object> entry = new java.util.LinkedHashMap<>();
//                        entry.put("externalId",    b.getExternalId());
//                        entry.put("title",         b.getTitle()         != null ? b.getTitle()         : "");
//                        entry.put("author",        b.getAuthor()        != null ? b.getAuthor()        : "");
//                        entry.put("coverUrl",      b.getCoverUrl()      != null ? b.getCoverUrl()      : "");
//                        entry.put("coverUrlSmall", b.getCoverUrlSmall() != null ? b.getCoverUrlSmall() : "");
//                        entry.put("averageRating", b.getAverageRating() != null ? b.getAverageRating() : 0.0);
//                        entry.put("ratingsCount",  b.getRatingsCount()  != null ? b.getRatingsCount()  : 0);
//                        entry.put("genres",        b.getGenres()        != null ? b.getGenres()        : List.of());
//                        entry.put("reason",        reason);
//                        recs.add(entry);
//                    });
//        } catch (Exception ignored) {}
//    }
//    // ── Helper ────────────────────────────────────────────────────────────
//    private Long resolveUserId(UserDetails principal) {
//        return userRepository.findByUsername(principal.getUsername())
//                .orElseThrow(() -> new BookLensException("User not found", HttpStatus.UNAUTHORIZED))
//                .getId();
//    }
//}
package com.booklens.controller;

import com.booklens.exception.BookLensException;
import com.booklens.repository.UserRepository;
import com.booklens.service.RecommendationService;
import com.booklens.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class UserController {

    private final UserService            userService;
    private final UserRepository         userRepository;
    private final RecommendationService  recommendationService;

    /**
     * GET /api/v1/users/{username}
     * Public profile view — no auth required.
     */
    @GetMapping("/users/{username}")
    public ResponseEntity<Map<String, Object>> getProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Long currentUserId = principal != null ? resolveUserId(principal) : null;
        return ResponseEntity.ok(userService.getProfile(username, currentUserId));
    }

    /**
     * PATCH /api/v1/me
     * Update own profile. Requires auth.
     */
    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestBody Map<String, Object> updates,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Long userId = resolveUserId(principal);
        userService.updateProfile(userId, updates);
        return ResponseEntity.ok(userService.getProfile(principal.getUsername(), userId));
    }

    /**
     * POST /api/v1/users/{userId}/follow
     */
    @PostMapping("/users/{userId}/follow")
    public ResponseEntity<Map<String, Object>> follow(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(userService.follow(resolveUserId(principal), userId));
    }

    /**
     * DELETE /api/v1/users/{userId}/follow
     */
    @DeleteMapping("/users/{userId}/follow")
    public ResponseEntity<Map<String, Object>> unfollow(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(userService.unfollow(resolveUserId(principal), userId));
    }

    /**
     * GET /api/v1/me/suggestions?limit=4
     * Suggested users to follow.
     */
    @GetMapping("/me/suggestions")
    public ResponseEntity<?> getSuggestedUsers(
            @RequestParam(defaultValue = "4") int limit,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(userService.getSuggestedUsers(resolveUserId(principal), limit));
    }

    /**
     * GET /api/v1/me/recommendations
     *
     * Reads from the persistent recommendation pool managed by RecommendationService.
     * The pool is seeded on first request and updated incrementally on every
     * log/rating — new signals surface fresh picks to the front, old ones drift
     * to the back and age off after POOL_MAX (15) total entries.
     */
    @GetMapping("/me/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getRecommendations(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(recommendationService.getRecommendations(resolveUserId(principal)));
    }

    // ── Helper ────────────────────────────────────────────────────────────
    private Long resolveUserId(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new BookLensException("User not found", HttpStatus.UNAUTHORIZED))
                .getId();
    }
}