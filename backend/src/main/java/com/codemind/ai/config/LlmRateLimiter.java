package com.codemind.ai.config;

import com.codemind.ai.exception.LlmRateLimitExceededException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter per user and per repository.
 * Enforces request frequency bounds before external LLM dispatch.
 */
@Component
public class LlmRateLimiter {

    private final LlmProperties properties;
    private final Map<UUID, Deque<Long>> userRequestTimestamps = new ConcurrentHashMap<>();
    private final Map<UUID, Deque<Long>> repoRequestTimestamps = new ConcurrentHashMap<>();

    public LlmRateLimiter(LlmProperties properties) {
        this.properties = properties;
    }

    /**
     * Checks if the user or repository exceeds the configured sliding-window rate limit.
     * Throws LlmRateLimitExceededException if exceeded.
     */
    public synchronized void checkLimit(UUID userId, UUID repositoryId) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - 60_000L; // 1 minute window

        if (userId != null) {
            Deque<Long> userQueue = userRequestTimestamps.computeIfAbsent(userId, k -> new ArrayDeque<>());
            cleanOldEntries(userQueue, windowStart);
            if (userQueue.size() >= properties.getRateLimitPerUserPerMinute()) {
                throw new LlmRateLimitExceededException(String.format(
                        "AI request rate limit exceeded for user %s: maximum %d requests per minute allowed.",
                        userId, properties.getRateLimitPerUserPerMinute()
                ));
            }
            userQueue.addLast(now);
        }

        if (repositoryId != null) {
            Deque<Long> repoQueue = repoRequestTimestamps.computeIfAbsent(repositoryId, k -> new ArrayDeque<>());
            cleanOldEntries(repoQueue, windowStart);
            if (repoQueue.size() >= properties.getRateLimitPerRepoPerMinute()) {
                throw new LlmRateLimitExceededException(String.format(
                        "AI request rate limit exceeded for repository %s: maximum %d requests per minute allowed.",
                        repositoryId, properties.getRateLimitPerRepoPerMinute()
                ));
            }
            repoQueue.addLast(now);
        }
    }

    private void cleanOldEntries(Deque<Long> queue, long windowStart) {
        while (!queue.isEmpty() && queue.peekFirst() < windowStart) {
            queue.pollFirst();
        }
    }

    public synchronized void reset() {
        userRequestTimestamps.clear();
        repoRequestTimestamps.clear();
    }
}
