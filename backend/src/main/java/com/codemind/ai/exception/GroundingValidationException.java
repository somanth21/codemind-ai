package com.codemind.ai.exception;

import com.codemind.common.exception.CodeMindException;

public class GroundingValidationException extends CodeMindException {
    public GroundingValidationException(String message) {
        super(message);
    }

    public GroundingValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
