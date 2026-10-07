package com.codemind.ai.evidence;

import com.codemind.analyzer.SecretScanner;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import com.codemind.ingestion.PathTraversalGuard;
import com.codemind.ingestion.SandboxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Minimizes, sanitizes, and prepares repository evidence for LLM reasoning.
 * Ensures zero secret leakage, neutralizes prompt-injection delimiters, and bounds chunk sizes.
 */
@Service
public class EvidenceSelectionService {

    private static final Logger log = LoggerFactory.getLogger(EvidenceSelectionService.class);

    private static final Pattern SECRET_PATTERN = Pattern.compile(
            "\\b(AKIA[0-9A-Z]{16})\\b|\\b(ghp_[a-zA-Z0-9]{20,40}|github_pat_[a-zA-Z0-9_]{30,})\\b|-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|\\b(xox[baprs]-[0-9a-zA-Z]{10,48})\\b|(?i)(?:api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token)\\s*[:=]\\s*[\"']([a-zA-Z0-9_\\-]{20,})[\"']"
    );

    private final ReuseEvidenceRepository reuseEvidenceRepository;
    private final SymbolRepository symbolRepository;
    private final QualityFindingRepository qualityFindingRepository;
    private final SecretFindingRepository secretFindingRepository;
    private final SecurityFindingRepository securityFindingRepository;
    private final ArchitectureAnalysisRepository architectureAnalysisRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final PathTraversalGuard pathTraversalGuard;
    private final SandboxProperties sandboxProperties;

    public EvidenceSelectionService(
            ReuseEvidenceRepository reuseEvidenceRepository,
            SymbolRepository symbolRepository,
            QualityFindingRepository qualityFindingRepository,
            SecretFindingRepository secretFindingRepository,
            SecurityFindingRepository securityFindingRepository,
            ArchitectureAnalysisRepository architectureAnalysisRepository,
            AnalysisRunRepository analysisRunRepository,
            RepositoryEntityRepository repositoryEntityRepository,
            PathTraversalGuard pathTraversalGuard,
            SandboxProperties sandboxProperties
    ) {
        this.reuseEvidenceRepository = reuseEvidenceRepository;
        this.symbolRepository = symbolRepository;
        this.qualityFindingRepository = qualityFindingRepository;
        this.secretFindingRepository = secretFindingRepository;
        this.securityFindingRepository = securityFindingRepository;
        this.architectureAnalysisRepository = architectureAnalysisRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.pathTraversalGuard = pathTraversalGuard;
        this.sandboxProperties = sandboxProperties;
    }

    /**
     * Selects, sanitizes, and labels evidence chunks for a reuse analysis.
     */
    public List<EvidenceChunk> selectEvidenceForReuse(
            UUID repositoryId,
            ReuseAnalysisEntity analysis,
            List<ReuseCandidateEntity> candidates
    ) {
        List<EvidenceChunk> chunks = new ArrayList<>();
        int evidenceCounter = 1;

        if (candidates == null || candidates.isEmpty()) {
            return chunks;
        }

        for (ReuseCandidateEntity candidate : candidates) {
            String evidenceId = "E" + (evidenceCounter++);

            // Extract source snippet from sandbox file
            String snippet = extractSnippet(repositoryId, candidate.getFilePath(), candidate.getStartLine(), candidate.getEndLine());
            if (snippet.isBlank()) {
                snippet = String.format("// Candidate: %s\n// Signature: %s\n// Candidate Type: %s\n// Explanation: %s",
                        candidate.getSymbolName(),
                        candidate.getSignature() != null ? candidate.getSignature() : "N/A",
                        candidate.getCandidateType(),
                        candidate.getExplanation() != null ? candidate.getExplanation() : "N/A"
                );
            }

            String sanitized = sanitizeSnippet(snippet);

            chunks.add(new EvidenceChunk(
                    evidenceId,
                    repositoryId,
                    analysis.getAnalysisId(),
                    candidate.getFilePath(),
                    candidate.getSymbolName(),
                    candidate.getStartLine(),
                    candidate.getEndLine(),
                    sanitized,
                    "REUSE_CANDIDATE_" + candidate.getCandidateType().name(),
                    candidate.getOverallScore()
            ));

            // Attach deterministic evidence rows from candidate
            List<ReuseEvidenceEntity> storedEvidence = reuseEvidenceRepository.findByCandidateId(candidate.getId());
            for (ReuseEvidenceEntity ev : storedEvidence) {
                String evId = "E" + (evidenceCounter++);
                String evSnippet = String.format("Metric/Observation: %s\nType: %s\nValue: %s",
                        ev.getDescription(), ev.getEvidenceType(), ev.getMetricValue() != null ? ev.getMetricValue() : "N/A");
                chunks.add(new EvidenceChunk(
                        evId,
                        repositoryId,
                        analysis.getAnalysisId(),
                        ev.getSourceFile() != null ? ev.getSourceFile() : candidate.getFilePath(),
                        candidate.getSymbolName(),
                        ev.getStartLine(),
                        ev.getEndLine(),
                        sanitizeSnippet(evSnippet),
                        "EVIDENCE_" + ev.getEvidenceType().name(),
                        candidate.getOverallScore() * 0.9
                ));
            }

            // If candidate has security gate warnings, add as critical evidence chunk
            if (candidate.getSecurityGate() != null && candidate.getSecurityGate() != SecurityGateStatus.SAFE) {
                String gateEvId = "E" + (evidenceCounter++);
                String gateSnippet = String.format("SECURITY GATE STATUS: %s\nGate Explanation: %s",
                        candidate.getSecurityGate(),
                        candidate.getExplanation() != null ? candidate.getExplanation() : "Security constraints triggered."
                );
                chunks.add(new EvidenceChunk(
                        gateEvId,
                        repositoryId,
                        analysis.getAnalysisId(),
                        candidate.getFilePath(),
                        candidate.getSymbolName(),
                        candidate.getStartLine(),
                        candidate.getEndLine(),
                        sanitizeSnippet(gateSnippet),
                        "SECURITY_GATE_WARNING",
                        1.0 // High priority
                ));
            }

            // Attach deterministic security findings on candidate file if present
            if (securityFindingRepository != null) {
                List<SecurityFindingEntity> secFindings = securityFindingRepository.findByRepositoryIdAndFilePath(repositoryId, candidate.getFilePath());
                for (SecurityFindingEntity sec : secFindings) {
                    String secEvId = "E" + (evidenceCounter++);
                    String secSnippet = String.format("SECURITY FINDING [%s]: %s\nRule: %s\nCategory: %s\nRemediation: %s\nEvidence: %s",
                            sec.getSeverity(), sec.getMessage(), sec.getRuleId(), sec.getCategory(), sec.getRemediation(),
                            sec.getEvidenceSnippet() != null ? sec.getEvidenceSnippet() : "N/A");
                    chunks.add(new EvidenceChunk(
                            secEvId,
                            repositoryId,
                            analysis.getAnalysisId(),
                            sec.getFilePath(),
                            candidate.getSymbolName(),
                            sec.getStartLine(),
                            sec.getEndLine(),
                            sanitizeSnippet(secSnippet),
                            "SECURITY_FINDING_" + sec.getSeverity().name(),
                            1.0
                    ));
                }
            }
        }

        return chunks;
    }

    /**
     * Extracts and sanitizes evidence chunks for security findings.
     */
    public List<EvidenceChunk> selectEvidenceForSecurity(
            UUID repositoryId,
            UUID securityAnalysisId,
            int limit
    ) {
        List<EvidenceChunk> chunks = new ArrayList<>();
        if (securityFindingRepository == null) return chunks;

        List<SecurityFindingEntity> findings = securityFindingRepository.findByAnalysisId(securityAnalysisId);
        int max = limit > 0 ? Math.min(findings.size(), limit) : findings.size();
        int counter = 1;

        for (int i = 0; i < max; i++) {
            SecurityFindingEntity f = findings.get(i);
            String evidenceId = "SEC" + (counter++);
            String snippet = String.format("Rule: %s\nSeverity: %s\nCategory: %s\nMessage: %s\nRemediation: %s\nSnippet: %s",
                    f.getRuleId(), f.getSeverity(), f.getCategory(), f.getMessage(), f.getRemediation(),
                    f.getEvidenceSnippet() != null ? f.getEvidenceSnippet() : "N/A");
            chunks.add(new EvidenceChunk(
                    evidenceId,
                    repositoryId,
                    securityAnalysisId,
                    f.getFilePath(),
                    f.getRuleId(),
                    f.getStartLine(),
                    f.getEndLine(),
                    sanitizeSnippet(snippet),
                    "SECURITY_FINDING_" + f.getSeverity().name(),
                    f.getSeverity() == Severity.CRITICAL ? 1.0 : (f.getSeverity() == Severity.HIGH ? 0.9 : 0.7)
            ));
        }
        return chunks;
    }

    /**
     * Extracts and sanitizes evidence chunks for architecture analysis.
     */
    public List<EvidenceChunk> selectEvidenceForArchitecture(
            UUID repositoryId,
            UUID architectureAnalysisId
    ) {
        List<EvidenceChunk> chunks = new ArrayList<>();
        if (architectureAnalysisRepository == null) return chunks;

        Optional<ArchitectureAnalysisEntity> opt = architectureAnalysisRepository.findById(architectureAnalysisId);
        if (opt.isEmpty()) return chunks;

        ArchitectureAnalysisEntity arch = opt.get();
        int counter = 1;

        if (arch.getHotspotsJson() != null && !arch.getHotspotsJson().isBlank()) {
            chunks.add(new EvidenceChunk(
                    "ARCH" + (counter++),
                    repositoryId,
                    architectureAnalysisId,
                    "architecture/hotspots.json",
                    "ArchitectureHotspots",
                    null,
                    null,
                    sanitizeSnippet("Architecture Hotspots:\n" + arch.getHotspotsJson()),
                    "ARCHITECTURE_HOTSPOTS",
                    0.85
            ));
        }

        if (arch.getCyclesJson() != null && !arch.getCyclesJson().isBlank() && arch.getCycleCount() > 0) {
            chunks.add(new EvidenceChunk(
                    "ARCH" + (counter++),
                    repositoryId,
                    architectureAnalysisId,
                    "architecture/cycles.json",
                    "DependencyCycles",
                    null,
                    null,
                    sanitizeSnippet("Dependency Cycles (Count: " + arch.getCycleCount() + "):\n" + arch.getCyclesJson()),
                    "ARCHITECTURE_CYCLES",
                    0.9
            ));
        }

        if (arch.getSmellsJson() != null && !arch.getSmellsJson().isBlank() && arch.getSmellCount() > 0) {
            chunks.add(new EvidenceChunk(
                    "ARCH" + (counter++),
                    repositoryId,
                    architectureAnalysisId,
                    "architecture/smells.json",
                    "ArchitectureSmells",
                    null,
                    null,
                    sanitizeSnippet("Architecture Smells (Count: " + arch.getSmellCount() + "):\n" + arch.getSmellsJson()),
                    "ARCHITECTURE_SMELLS",
                    0.8
            ));
        }

        return chunks;
    }

    /**
     * Extracts and sanitizes evidence chunks for arbitrary repository queries.
     * Incorporates repository & architecture overview, keyword matching, domain findings,
     * and representative code snippets so any query has grounded evidence.
     */
    public List<EvidenceChunk> selectEvidenceForQuery(
            UUID repositoryId,
            UUID analysisId,
            String query,
            int limit
    ) {
        List<EvidenceChunk> chunks = new ArrayList<>();
        int counter = 1;
        int maxChunks = limit > 0 ? Math.min(limit, 5) : 5;

        List<SymbolEntity> symbols = symbolRepository.findByAnalysisId(analysisId);
        RepositoryEntity repo = repositoryEntityRepository != null ? repositoryEntityRepository.findById(repositoryId).orElse(null) : null;
        AnalysisRunEntity run = analysisRunRepository != null ? analysisRunRepository.findById(analysisId).orElse(null) : null;
        ArchitectureAnalysisEntity arch = architectureAnalysisRepository != null
                ? architectureAnalysisRepository.findFirstByRepositoryIdAndAnalysisIdOrderByCreatedAtDesc(repositoryId, analysisId)
                    .or(() -> architectureAnalysisRepository.findFirstByRepositoryIdOrderByCreatedAtDesc(repositoryId))
                    .orElse(null)
                : null;

        // 1. Synthesize Repository & Architecture Overview Chunk (E1)
        StringBuilder overviewSb = new StringBuilder();
        overviewSb.append(String.format("Repository: %s (Source: %s)\n",
                repo != null ? repo.getName() : "Unknown",
                repo != null ? repo.getSourceType() : "LOCAL"));
        if (run != null) {
            overviewSb.append(String.format("Authoritative Deterministic Metrics:\n- Physical LOC: %,d\n- Analyzed Files: %d (Skipped: %d)\n- AST Classes: %d\n- AST Methods: %d\n- Average Cyclomatic Complexity: %.1f\n- Maintainability Index: %.1f / 100\n",
                    run.getTotalLoc(), run.getFilesAnalyzed(), run.getFilesSkipped(), run.getTotalClasses(), run.getTotalMethods(), run.getAverageComplexity(), run.getMaintainabilityIndex()));
        }
        if (arch != null) {
            overviewSb.append(String.format("Architecture Analysis:\n- Dependency Cycles: %d\n- Architecture Smells: %d\n",
                    arch.getCycleCount(), arch.getSmellCount()));
        }

        Set<String> packageSet = new TreeSet<>();
        for (SymbolEntity s : symbols) {
            if (s.getFilePath() != null && s.getFilePath().contains("/")) {
                String dir = s.getFilePath().substring(0, s.getFilePath().lastIndexOf("/"));
                packageSet.add(dir);
            }
        }
        if (!packageSet.isEmpty()) {
            overviewSb.append("Key Packages / Directories:\n");
            int pkgCount = 0;
            for (String pkg : packageSet) {
                overviewSb.append("- ").append(pkg).append("\n");
                if (++pkgCount >= 8) break;
            }
        }

        chunks.add(new EvidenceChunk(
                "E" + (counter++),
                repositoryId,
                analysisId,
                "repository/overview",
                repo != null ? repo.getName() : "RepositoryOverview",
                1,
                1,
                sanitizeSnippet(overviewSb.toString()),
                "REPOSITORY_ARCHITECTURE_OVERVIEW",
                1.0
        ));

        String lowerQuery = query != null ? query.toLowerCase() : "";

        // 2. Domain-specific findings augmentation
        boolean isSecurityQuery = lowerQuery.matches(".*(secur|vuln|cve|owasp|secret|token|password|leak|inject|xss|csrf|risk|safe).*");
        boolean isArchQuery = lowerQuery.matches(".*(arch|design|structur|pattern|hotspot|cycle|smell|layer|coupling|modular).*");
        boolean isQualityQuery = lowerQuery.matches(".*(qualit|complex|maintainab|smell|debt|refactor|clean).*");

        if (isSecurityQuery && securityFindingRepository != null) {
            List<SecurityFindingEntity> secFindings = securityFindingRepository.findByAnalysisId(analysisId);
            for (int i = 0; i < Math.min(2, secFindings.size()) && chunks.size() < maxChunks; i++) {
                SecurityFindingEntity f = secFindings.get(i);
                String snippet = String.format("Rule: %s [%s]\nCategory: %s\nMessage: %s\nRemediation: %s",
                        f.getRuleId(), f.getSeverity(), f.getCategory(), f.getMessage(), f.getRemediation());
                chunks.add(new EvidenceChunk(
                        "E" + (counter++),
                        repositoryId,
                        analysisId,
                        f.getFilePath(),
                        f.getRuleId(),
                        f.getStartLine(),
                        f.getEndLine(),
                        sanitizeSnippet(snippet),
                        "SECURITY_FINDING_" + f.getSeverity(),
                        0.95
                ));
            }
        }

        if (isArchQuery && arch != null && chunks.size() < maxChunks) {
            if (arch.getCyclesJson() != null && !arch.getCyclesJson().isBlank() && arch.getCycleCount() > 0) {
                chunks.add(new EvidenceChunk(
                        "E" + (counter++),
                        repositoryId,
                        analysisId,
                        "architecture/cycles.json",
                        "DependencyCycles",
                        null,
                        null,
                        sanitizeSnippet("Cycles (Count: " + arch.getCycleCount() + "):\n" + arch.getCyclesJson()),
                        "ARCHITECTURE_CYCLES",
                        0.9
                ));
            }
            if (arch.getSmellsJson() != null && !arch.getSmellsJson().isBlank() && arch.getSmellCount() > 0 && chunks.size() < maxChunks) {
                chunks.add(new EvidenceChunk(
                        "E" + (counter++),
                        repositoryId,
                        analysisId,
                        "architecture/smells.json",
                        "ArchitectureSmells",
                        null,
                        null,
                        sanitizeSnippet("Smells (Count: " + arch.getSmellCount() + "):\n" + arch.getSmellsJson()),
                        "ARCHITECTURE_SMELLS",
                        0.85
                ));
            }
        }

        if (isQualityQuery && qualityFindingRepository != null && chunks.size() < maxChunks) {
            List<QualityFindingEntity> qFindings = qualityFindingRepository.findByAnalysisId(analysisId);
            for (int i = 0; i < Math.min(2, qFindings.size()) && chunks.size() < maxChunks; i++) {
                QualityFindingEntity qf = qFindings.get(i);
                String snippet = String.format("Quality Finding [%s]: %s - %s\nRule: %s\nLine: %s",
                        qf.getSeverity(), qf.getTitle(), qf.getDescription(), qf.getRuleId(), qf.getLineNumber());
                chunks.add(new EvidenceChunk(
                        "E" + (counter++),
                        repositoryId,
                        analysisId,
                        qf.getFilePath(),
                        qf.getRuleId(),
                        qf.getLineNumber(),
                        qf.getLineNumber(),
                        sanitizeSnippet(snippet),
                        "QUALITY_FINDING_" + qf.getSeverity(),
                        0.8
                ));
            }
        }

        // 3. Keyword Tokenization & Symbol Scoring
        Set<String> stopWords = Set.of(
                "what", "where", "when", "which", "who", "whom", "whose", "why", "how", "does", "doing", "did",
                "are", "were", "been", "being", "have", "has", "had", "can", "could", "should", "would", "will",
                "shall", "may", "might", "must", "the", "this", "that", "these", "those", "and", "but", "for",
                "nor", "yet", "from", "into", "onto", "about", "above", "after", "again", "against", "all", "any",
                "both", "each", "few", "more", "most", "other", "some", "such", "than", "too", "very", "project",
                "repository", "repo", "codebase", "code", "file", "files", "class", "classes", "method", "methods",
                "show", "tell", "explain", "give", "list", "describe", "find", "please", "with", "work", "works"
        );
        List<String> keywords = new ArrayList<>();
        if (!lowerQuery.isBlank()) {
            for (String token : lowerQuery.split("[^a-zA-Z0-9]+")) {
                if (token.length() >= 3 && !stopWords.contains(token)) {
                    keywords.add(token);
                }
            }
        }

        record ScoredSymbol(SymbolEntity symbol, int score) {}
        List<ScoredSymbol> scoredSymbols = new ArrayList<>();

        for (SymbolEntity s : symbols) {
            int score = 0;
            String sName = s.getName().toLowerCase();
            String sPath = s.getFilePath() != null ? s.getFilePath().toLowerCase() : "";
            String sSig = s.getSignature() != null ? s.getSignature().toLowerCase() : "";

            if (!lowerQuery.isBlank() && sName.contains(lowerQuery)) {
                score += 30;
            }

            for (String kw : keywords) {
                if (sName.equals(kw)) {
                    score += 15;
                } else if (sName.contains(kw) || kw.contains(sName)) {
                    score += 8;
                }
                if (sPath.contains(kw)) score += 4;
                if (sSig.contains(kw)) score += 3;
            }

            if (s.getKind() == SymbolKind.CLASS || s.getKind() == SymbolKind.INTERFACE) {
                score += 2;
            }

            if (score > 0) {
                scoredSymbols.add(new ScoredSymbol(s, score));
            }
        }

        scoredSymbols.sort((a, b) -> Integer.compare(b.score(), a.score()));

        Set<String> addedSymbolNames = new HashSet<>();
        List<SymbolEntity> selectedSymbols = new ArrayList<>();

        for (ScoredSymbol ss : scoredSymbols) {
            if (addedSymbolNames.add(ss.symbol().getName())) {
                selectedSymbols.add(ss.symbol());
                if (selectedSymbols.size() >= maxChunks - chunks.size()) break;
            }
        }

        // 4. Fallback representative symbols if matches are low
        if (selectedSymbols.size() < (maxChunks - chunks.size())) {
            List<SymbolEntity> representative = symbols.stream()
                    .filter(s -> s.getKind() == SymbolKind.CLASS || s.getKind() == SymbolKind.INTERFACE)
                    .filter(s -> !addedSymbolNames.contains(s.getName()))
                    .sorted((a, b) -> {
                        boolean aSpecial = a.getName().matches(".*(Controller|Service|Repository|Application|Config|Model|Handler).*");
                        boolean bSpecial = b.getName().matches(".*(Controller|Service|Repository|Application|Config|Model|Handler).*");
                        return Boolean.compare(bSpecial, aSpecial);
                    })
                    .limit(maxChunks - chunks.size() - selectedSymbols.size())
                    .toList();

            for (SymbolEntity rep : representative) {
                if (addedSymbolNames.add(rep.getName())) {
                    selectedSymbols.add(rep);
                }
            }
        }

        // 5. Build code evidence chunks
        for (SymbolEntity s : selectedSymbols) {
            if (chunks.size() >= maxChunks) break;
            String evidenceId = "E" + (counter++);
            String snippet = extractSnippet(repositoryId, s.getFilePath(), s.getStartLine(), s.getEndLine());
            if (snippet.isBlank()) {
                snippet = String.format("// Symbol: %s (%s)\n// Path: %s\n// Signature: %s",
                        s.getName(), s.getKind(), s.getFilePath(), s.getSignature() != null ? s.getSignature() : "N/A");
            }

            chunks.add(new EvidenceChunk(
                    evidenceId,
                    repositoryId,
                    analysisId,
                    s.getFilePath(),
                    s.getName(),
                    s.getStartLine(),
                    s.getEndLine(),
                    sanitizeSnippet(snippet),
                    "SYMBOL_" + s.getKind(),
                    0.85
            ));
        }

        return chunks;
    }

    /**
     * Reads line ranges from sandboxed file.
     */
    private String extractSnippet(UUID repositoryId, String filePath, Integer startLine, Integer endLine) {
        if (filePath == null || filePath.isBlank()) {
            return "";
        }
        try {
            Path sourceRoot = sandboxProperties.getRootPath().resolve(repositoryId.toString()).resolve("source");
            Path targetFile = pathTraversalGuard.validateAndResolve(
                    filePath,
                    sourceRoot,
                    sandboxProperties.getMaxPathLength(),
                    sandboxProperties.getMaxFilenameLength()
            );

            if (!Files.isRegularFile(targetFile)) {
                return "";
            }

            List<String> allLines = Files.readAllLines(targetFile);
            int start = startLine != null ? Math.max(1, startLine) : 1;
            int end = endLine != null ? Math.min(allLines.size(), endLine) : Math.min(allLines.size(), start + 40);

            if (start > allLines.size() || start > end) {
                return "";
            }

            StringBuilder sb = new StringBuilder();
            for (int i = start - 1; i < end && i < allLines.size(); i++) {
                sb.append(allLines.get(i)).append("\n");
                if (sb.length() > 2000) {
                    sb.append("// ... [TRUNCATED LINES]\n");
                    break;
                }
            }
            return sb.toString();
        } catch (Exception e) {
            log.debug("Could not read source snippet from sandbox for {}: {}", filePath, e.getMessage());
            return "";
        }
    }

    /**
     * Sanitizes snippet:
     * - Strips/masks raw secrets
     * - Neutralizes prompt injection delimiter tags
     * - Normalizes line endings
     * - Bounds maximum length
     */
    public static String sanitizeSnippet(String text) {
        if (text == null) {
            return "";
        }

        String normalized = text.replace("\r\n", "\n").replace("\r", "\n");

        // Neutralize prompt injection delimiter tags
        String safeDelimiters = normalized
                .replace("<BEGIN_REPOSITORY_EVIDENCE>", "[BEGIN_REPOSITORY_EVIDENCE]")
                .replace("<END_REPOSITORY_EVIDENCE>", "[END_REPOSITORY_EVIDENCE]")
                .replace("<SYSTEM>", "[SYSTEM]")
                .replace("</SYSTEM>", "[/SYSTEM]")
                .replace("<system>", "[system]")
                .replace("</system>", "[/system]")
                .replace("<PROMPT_INJECTION>", "[PROMPT_INJECTION]")
                .replace("<BEGIN_REASONING>", "[BEGIN_REASONING]")
                .replace("<END_REASONING>", "[END_REASONING]");

        // Redact detected raw secrets
        Matcher matcher = SECRET_PATTERN.matcher(safeDelimiters);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String secret = matcher.group(0);
            matcher.appendReplacement(sb, Matcher.quoteReplacement("[REDACTED_SECRET]"));
        }
        matcher.appendTail(sb);

        String result = sb.toString();
        if (result.length() > 1500) {
            result = result.substring(0, 1500) + "\n// ... [TRUNCATED SNIPPET]";
        }

        return result;
    }
}
