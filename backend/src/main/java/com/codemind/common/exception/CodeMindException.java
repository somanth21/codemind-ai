package com.codemind.common.exception;

public class CodeMindException extends RuntimeException {
    public CodeMindException(String message) {
        super(message);
    }

    public CodeMindException(String message, Throwable cause) {
        super(message, cause);
    }
}
