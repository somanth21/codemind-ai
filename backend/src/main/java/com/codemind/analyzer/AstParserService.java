package com.codemind.analyzer;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AstParserService {

    private static final Logger log = LoggerFactory.getLogger(AstParserService.class);
    private final JavaParser javaParser;

    public record AstParseResult(
            Optional<CompilationUnit> compilationUnit,
            boolean successful,
            List<String> problemMessages
    ) {}

    public AstParserService() {
        ParserConfiguration config = new ParserConfiguration();
        config.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_17);
        config.setAttributeComments(true);
        this.javaParser = new JavaParser(config);
    }

    public ParseResult<CompilationUnit> parse(String code) {
        if (code == null) {
            code = "";
        }
        return javaParser.parse(code);
    }

    public AstParseResult parseSafely(String code, String filePath) {
        try {
            ParseResult<CompilationUnit> result = parse(code);
            List<String> problemMessages = new ArrayList<>();
            result.getProblems().forEach(p -> problemMessages.add(p.getMessage()));

            if (result.isSuccessful() && result.getResult().isPresent()) {
                return new AstParseResult(result.getResult(), true, List.of());
            }

            if (result.getResult().isPresent()) {
                log.warn("Partial AST parse for file {}: {} problems encountered", filePath, result.getProblems().size());
                return new AstParseResult(result.getResult(), false, problemMessages);
            }

            log.warn("Failed to parse AST for file {}: {}", filePath, result.getProblems());
            return new AstParseResult(Optional.empty(), false, problemMessages);
        } catch (Exception e) {
            log.warn("Exception during AST parsing for file {}: {}", filePath, e.getMessage());
            return new AstParseResult(Optional.empty(), false, List.of(e.getMessage() != null ? e.getMessage() : "Unknown parser error"));
        }
    }
}
