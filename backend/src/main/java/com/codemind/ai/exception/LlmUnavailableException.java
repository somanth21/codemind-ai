package com.codemind.ai.exception;

import com.codemind.common.exception.CodeMindException;

public class LlmUnavailableException extends CodeMindException {
    public LlmUnavailableException(String message) {
        super(message);
    }

    public LlmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
