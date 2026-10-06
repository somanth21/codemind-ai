package com.codemind.web.exception;

import com.codemind.common.exception.CodeMindException;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.common.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationExceptions(MethodArgumentNotValidException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Request validation failed. Please check the supplied parameters."
        );
        problemDetail.setTitle("Validation Failed");
        problemDetail.setType(URI.create("https://codemind.ai/errors/validation-error"));

        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        problemDetail.setProperty("errors", errors);
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(ValidationException.class)
    public ProblemDetail handleCustomValidationException(ValidationException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problemDetail.setTitle("Validation Error");
        problemDetail.setType(URI.create("https://codemind.ai/errors/validation-error"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ProblemDetail handleIllegalArgumentException(RuntimeException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problemDetail.setTitle("Invalid Request");
        problemDetail.setType(URI.create("https://codemind.ai/errors/bad-request"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentialsException(BadCredentialsException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage()
        );
        problemDetail.setTitle("Authentication Failed");
        problemDetail.setType(URI.create("https://codemind.ai/errors/bad-credentials"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(ForbiddenException.class)
    public ProblemDetail handleForbiddenException(ForbiddenException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );
        problemDetail.setTitle("Forbidden");
        problemDetail.setType(URI.create("https://codemind.ai/errors/forbidden"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ProblemDetail handleMaxUploadSizeExceeded(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "Uploaded archive exceeds the maximum permissible upload size limit."
        );
        problemDetail.setTitle("Payload Too Large");
        problemDetail.setType(URI.create("https://codemind.ai/errors/payload-too-large"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDeniedException(AccessDeniedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "Access is denied. You do not possess the required permissions."
        );
        problemDetail.setTitle("Forbidden");
        problemDetail.setType(URI.create("https://codemind.ai/errors/forbidden"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFoundException(ResourceNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problemDetail.setTitle("Resource Not Found");
        problemDetail.setType(URI.create("https://codemind.ai/errors/not-found"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(com.codemind.ai.exception.LlmUnavailableException.class)
    public ProblemDetail handleLlmUnavailableException(com.codemind.ai.exception.LlmUnavailableException ex) {
        log.warn("LLM Provider Unavailable: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getMessage()
        );
        problemDetail.setTitle("LLM Provider Unavailable");
        problemDetail.setType(URI.create("https://codemind.ai/errors/llm-unavailable"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(com.codemind.ai.exception.LlmRateLimitExceededException.class)
    public ProblemDetail handleLlmRateLimitExceededException(com.codemind.ai.exception.LlmRateLimitExceededException ex) {
        log.warn("LLM Rate Limit Exceeded: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS,
                ex.getMessage()
        );
        problemDetail.setTitle("Rate Limit Exceeded");
        problemDetail.setType(URI.create("https://codemind.ai/errors/rate-limit-exceeded"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(com.codemind.ai.exception.GroundingValidationException.class)
    public ProblemDetail handleGroundingValidationException(com.codemind.ai.exception.GroundingValidationException ex) {
        log.warn("Grounding Validation Error: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ex.getMessage()
        );
        problemDetail.setTitle("Grounding Validation Error");
        problemDetail.setType(URI.create("https://codemind.ai/errors/grounding-validation-error"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(CodeMindException.class)
    public ProblemDetail handleCodeMindException(CodeMindException ex) {
        log.warn("Application domain error: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problemDetail.setTitle("Application Error");
        problemDetail.setType(URI.create("https://codemind.ai/errors/domain-error"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnhandledException(Exception ex) {
        // Critical: Do NOT expose stack traces or internal exception details to API clients
        String correlationId = MDC.get("correlationId");
        log.error("Unhandled internal exception [correlationId={}]: {}", correlationId, ex.getMessage(), ex);

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected internal error occurred. Please contact system administrator with the correlation ID."
        );
        problemDetail.setTitle("Internal Server Error");
        problemDetail.setType(URI.create("https://codemind.ai/errors/internal-server-error"));
        enrichProblemDetail(problemDetail);
        return problemDetail;
    }

    private void enrichProblemDetail(ProblemDetail problemDetail) {
        problemDetail.setProperty("timestamp", Instant.now().toString());
        String correlationId = MDC.get("correlationId");
        if (correlationId != null) {
            problemDetail.setProperty("correlationId", correlationId);
        }
    }
}
