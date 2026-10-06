package com.codemind.analyzer;

import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AstParserServiceTest {

    private AstParserService astParserService;

    @BeforeEach
    void setUp() {
        astParserService = new AstParserService();
    }

    @Test
    void parse_validJavaCode_returnsCompilationUnit() {
        String code = """
                package com.example;
                public class Hello {
                    public void sayHi() {
                        System.out.println("Hello World");
                    }
                }
                """;

        ParseResult<CompilationUnit> result = astParserService.parse(code);
        assertThat(result.isSuccessful()).isTrue();
        assertThat(result.getResult()).isPresent();
        assertThat(result.getResult().get().getType(0).getNameAsString()).isEqualTo("Hello");
    }

    @Test
    void parseSafely_malformedJavaCode_doesNotThrowAndReturnsGracefully() {
        String malformedCode = """
                package com.example;
                public class Broken {
                    public void invalid( { // unclosed parenthesis
                """;

        AstParserService.AstParseResult parseResult = astParserService.parseSafely(malformedCode, "Broken.java");
        assertThat(parseResult).isNotNull();
        assertThat(parseResult.successful()).isFalse();
        assertThat(parseResult.problemMessages()).isNotEmpty();
    }
}
