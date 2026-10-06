package com.codemind.analyzer;

import com.codemind.domain.model.SymbolEntity;
import com.codemind.domain.model.SymbolKind;
import com.codemind.domain.model.SymbolVisibility;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JavaSymbolExtractorTest {

    private JavaSymbolExtractor extractor;
    private JavaParser parser;

    @BeforeEach
    void setUp() {
        extractor = new JavaSymbolExtractor();
        parser = new JavaParser();
    }

    @Test
    void extractSymbols_extractsAllKindsAndProperties() {
        String code = """
                package com.codemind.demo;
                
                public class UserService {
                    private String secretKey;
                    
                    public UserService(String key) {
                        this.secretKey = key;
                    }
                    
                    public String findUser(int id) {
                        return "user" + id;
                    }
                    
                    public enum Status { ACTIVE, INACTIVE }
                    public record Point(int x, int y) {}
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        List<SymbolEntity> symbols = extractor.extractSymbols(cu, repoId, runId, "com/codemind/demo/UserService.java");

        assertThat(symbols).isNotEmpty();

        // 1. Package
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.PACKAGE && "com.codemind.demo".equals(s.getName()));

        // 2. Class
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.CLASS && "UserService".equals(s.getName())
                && s.getVisibility() == SymbolVisibility.PUBLIC);

        // 3. Field
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.FIELD && "secretKey".equals(s.getName())
                && s.getVisibility() == SymbolVisibility.PRIVATE);

        // 4. Constructor
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.CONSTRUCTOR && "UserService".equals(s.getName())
                && s.getParameterCount() == 1);

        // 5. Method
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.METHOD && "findUser".equals(s.getName())
                && "String".equals(s.getReturnType()) && s.getParameterCount() == 1);

        // 6. Enum
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.ENUM && "Status".equals(s.getName()));

        // 7. Record
        assertThat(symbols).anyMatch(s -> s.getKind() == SymbolKind.RECORD && "Point".equals(s.getName()));
    }
}
