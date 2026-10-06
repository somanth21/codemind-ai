package com.codemind.ai.exception;

import com.codemind.common.exception.CodeMindException;

public class LlmRateLimitExceededException extends CodeMindException {
    public LlmRateLimitExceededException(String message) {
        super(message);
    }

    public LlmRateLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
