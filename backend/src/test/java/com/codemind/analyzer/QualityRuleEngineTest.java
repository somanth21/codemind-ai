package com.codemind.analyzer;

import com.codemind.domain.model.QualityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.domain.model.SymbolEntity;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class QualityRuleEngineTest {

    private QualityRuleEngine ruleEngine;
    private JavaSymbolExtractor symbolExtractor;
    private JavaParser parser;

    @BeforeEach
    void setUp() {
        MetricsCalculator metricsCalculator = new MetricsCalculator();
        ruleEngine = new QualityRuleEngine(metricsCalculator);
        symbolExtractor = new JavaSymbolExtractor();
        parser = new JavaParser();
    }

    @Test
    void analyzeQuality_detectsEmptyCatchAndTodoMarkers() {
        String code = """
                package com.example;
                public class DebtExample {
                    // TODO: refactor this method later
                    public void risky() {
                        try {
                            int x = 1 / 0;
                        } catch (Exception e) {
                        }
                    }
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        List<SymbolEntity> symbols = symbolExtractor.extractSymbols(cu, repoId, runId, "DebtExample.java");
        List<QualityFindingEntity> findings = ruleEngine.analyzeQuality(cu, repoId, runId, "DebtExample.java", symbols);

        assertThat(findings).isNotEmpty();

        // 1. Empty catch block
        assertThat(findings).anyMatch(f -> "EMPTY_CATCH_BLOCK".equals(f.getRuleId())
                && f.getSeverity() == Severity.HIGH);

        // 2. TODO marker
        assertThat(findings).anyMatch(f -> "TODO_FIXME_MARKER".equals(f.getRuleId())
                && f.getSeverity() == Severity.INFO);
    }

    @Test
    void analyzeQuality_detectsTooManyParameters() {
        String code = """
                package com.example;
                public class ParamExample {
                    public void lotsOfParams(int a, int b, int c, int d, int e, int f) {
                    }
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        List<SymbolEntity> symbols = symbolExtractor.extractSymbols(cu, repoId, runId, "ParamExample.java");
        List<QualityFindingEntity> findings = ruleEngine.analyzeQuality(cu, repoId, runId, "ParamExample.java", symbols);

        assertThat(findings).anyMatch(f -> "TOO_MANY_PARAMETERS".equals(f.getRuleId())
                && f.getSeverity() == Severity.MEDIUM);
    }
}
