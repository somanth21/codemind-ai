package com.codemind.analyzer;

import com.codemind.domain.model.RelationshipConfidence;
import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.RelationshipType;
import com.codemind.domain.model.SymbolEntity;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JavaRelationshipExtractorTest {

    private JavaSymbolExtractor symbolExtractor;
    private JavaRelationshipExtractor relationshipExtractor;
    private JavaParser parser;

    @BeforeEach
    void setUp() {
        symbolExtractor = new JavaSymbolExtractor();
        relationshipExtractor = new JavaRelationshipExtractor();
        parser = new JavaParser();
    }

    @Test
    void extractRelationships_extractsExtendsImplementsCallsCreates() {
        String code = """
                package com.codemind.rel;
                import java.io.Serializable;
                import java.util.ArrayList;
                
                public class OrderService extends BaseService implements Serializable {
                    public void process() {
                        ArrayList list = new ArrayList();
                        this.validate();
                    }
                    
                    private void validate() {}
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        List<SymbolEntity> symbols = symbolExtractor.extractSymbols(cu, repoId, runId, "com/codemind/rel/OrderService.java");
        List<RelationshipEntity> relationships = relationshipExtractor.extractRelationships(cu, repoId, runId, symbols);

        assertThat(relationships).isNotEmpty();

        // 1. EXTENDS
        assertThat(relationships).anyMatch(r -> r.getRelationshipType() == RelationshipType.EXTENDS
                && r.getTargetFqn().contains("BaseService"));

        // 2. IMPLEMENTS
        assertThat(relationships).anyMatch(r -> r.getRelationshipType() == RelationshipType.IMPLEMENTS
                && "java.io.Serializable".equals(r.getTargetFqn())
                && r.getConfidence() == RelationshipConfidence.RESOLVED);

        // 3. CREATES
        assertThat(relationships).anyMatch(r -> r.getRelationshipType() == RelationshipType.CREATES
                && "java.util.ArrayList".equals(r.getTargetFqn()));

        // 4. CALLS
        assertThat(relationships).anyMatch(r -> r.getRelationshipType() == RelationshipType.CALLS
                && r.getTargetFqn().contains("validate"));
    }
}
