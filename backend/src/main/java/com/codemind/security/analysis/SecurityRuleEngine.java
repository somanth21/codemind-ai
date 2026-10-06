package com.codemind.security.analysis;

import com.codemind.analyzer.AstParserService;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.domain.model.SymbolEntity;
import com.github.javaparser.ast.CompilationUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Deterministic Security Rule Execution Engine.
 * Executes registered security rules across repository files and aggregates risk classifications.
 */
@Component
public class SecurityRuleEngine {

    private static final Logger log = LoggerFactory.getLogger(SecurityRuleEngine.class);

    private final SecurityRuleRegistry registry;
    private final AstParserService astParserService;

    public record SecurityScanResult(
            List<SecurityFindingEntity> findings,
            int totalCount,
            int criticalCount,
            int highCount,
            int mediumCount,
            int lowCount,
            int infoCount,
            double riskScore
    ) {}

    public SecurityRuleEngine(SecurityRuleRegistry registry, AstParserService astParserService) {
        this.registry = registry;
        this.astParserService = astParserService;
    }

    public SecurityScanResult scanFile(
            String filePath,
            String sourceCode,
            UUID repositoryId,
            UUID analysisId,
            List<SymbolEntity> symbols
    ) {
        Map<String, UUID> fqnToSymbolId = new HashMap<>();
        if (symbols != null) {
            for (SymbolEntity s : symbols) {
                if (s.getFqn() != null) {
                    fqnToSymbolId.put(s.getFqn(), s.getId());
                }
            }
        }

        CompilationUnit cu = null;
        if (filePath.endsWith(".java") && sourceCode != null && !sourceCode.isBlank()) {
            AstParserService.AstParseResult parseResult = astParserService.parseSafely(sourceCode, filePath);
            cu = parseResult.compilationUnit().orElse(null);
        }

        List<SecurityFindingEntity> findings = new ArrayList<>();
        for (SecurityRule rule : registry.getRules()) {
            try {
                List<SecurityFindingEntity> ruleFindings = rule.analyze(
                        cu, filePath, repositoryId, analysisId, fqnToSymbolId, sourceCode
                );
                if (ruleFindings != null) {
                    findings.addAll(ruleFindings);
                }
            } catch (Exception e) {
                log.warn("Security rule {} threw exception on file {}: {}", rule.getRuleId(), filePath, e.getMessage());
            }
        }

        return aggregateResults(findings);
    }

    public SecurityScanResult aggregateResults(List<SecurityFindingEntity> allFindings) {
        int critical = 0, high = 0, medium = 0, low = 0, info = 0;

        for (SecurityFindingEntity f : allFindings) {
            if (f.getSeverity() == Severity.CRITICAL) critical++;
            else if (f.getSeverity() == Severity.HIGH) high++;
            else if (f.getSeverity() == Severity.MEDIUM) medium++;
            else if (f.getSeverity() == Severity.LOW) low++;
            else if (f.getSeverity() == Severity.INFO) info++;
        }

        double riskScore = Math.min(100.0, (critical * 25.0) + (high * 10.0) + (medium * 3.0) + (low * 1.0));

        return new SecurityScanResult(
                allFindings,
                allFindings.size(),
                critical,
                high,
                medium,
                low,
                info,
                riskScore
        );
    }
}
