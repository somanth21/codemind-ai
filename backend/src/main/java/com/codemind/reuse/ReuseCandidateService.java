package com.codemind.reuse;

import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ReuseCandidateService {

    private static final Set<String> STOPWORDS = Set.of(
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
            "is", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has",
            "new", "get", "set", "make", "create", "impl", "implementation"
    );

    private static final Pattern CAMEL_CASE_PATTERN = Pattern.compile("(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])");

    private final SymbolRepository symbolRepository;
    private final SymbolMetricsRepository symbolMetricsRepository;
    private final FileMetricsRepository fileMetricsRepository;
    private final QualityFindingRepository qualityFindingRepository;
    private final SecretFindingRepository secretFindingRepository;
    private final RelationshipRepository relationshipRepository;
    private final ReuseScoringConfig config;
    private final SecurityFindingRepository securityFindingRepository;

    public static class DiscoveredCandidate {
        public final SymbolEntity symbol;
        public final double functionalRelevance;
        public final SymbolMetricsEntity symbolMetrics;
        public final FileMetricsEntity fileMetrics;
        public final List<QualityFindingEntity> qualityFindings;
        public final List<SecretFindingEntity> secretFindings;
        public final List<SecurityFindingEntity> securityFindings;
        public final int callerCount;
        public final int calleeCount;

        public DiscoveredCandidate(
                SymbolEntity symbol,
                double functionalRelevance,
                SymbolMetricsEntity symbolMetrics,
                FileMetricsEntity fileMetrics,
                List<QualityFindingEntity> qualityFindings,
                List<SecretFindingEntity> secretFindings,
                int callerCount,
                int calleeCount
        ) {
            this(symbol, functionalRelevance, symbolMetrics, fileMetrics, qualityFindings, secretFindings, List.of(), callerCount, calleeCount);
        }

        public DiscoveredCandidate(
                SymbolEntity symbol,
                double functionalRelevance,
                SymbolMetricsEntity symbolMetrics,
                FileMetricsEntity fileMetrics,
                List<QualityFindingEntity> qualityFindings,
                List<SecretFindingEntity> secretFindings,
                List<SecurityFindingEntity> securityFindings,
                int callerCount,
                int calleeCount
        ) {
            this.symbol = symbol;
            this.functionalRelevance = functionalRelevance;
            this.symbolMetrics = symbolMetrics;
            this.fileMetrics = fileMetrics;
            this.qualityFindings = qualityFindings != null ? qualityFindings : List.of();
            this.secretFindings = secretFindings != null ? secretFindings : List.of();
            this.securityFindings = securityFindings != null ? securityFindings : List.of();
            this.callerCount = callerCount;
            this.calleeCount = calleeCount;
        }
    }

    public ReuseCandidateService(
            SymbolRepository symbolRepository,
            SymbolMetricsRepository symbolMetricsRepository,
            FileMetricsRepository fileMetricsRepository,
            QualityFindingRepository qualityFindingRepository,
            SecretFindingRepository secretFindingRepository,
            RelationshipRepository relationshipRepository,
            ReuseScoringConfig config,
            SecurityFindingRepository securityFindingRepository
    ) {
        this.symbolRepository = symbolRepository;
        this.symbolMetricsRepository = symbolMetricsRepository;
        this.fileMetricsRepository = fileMetricsRepository;
        this.qualityFindingRepository = qualityFindingRepository;
        this.secretFindingRepository = secretFindingRepository;
        this.relationshipRepository = relationshipRepository;
        this.config = config;
        this.securityFindingRepository = securityFindingRepository;
    }

    public List<DiscoveredCandidate> discoverCandidates(UUID repositoryId, UUID analysisId, String query, int topK) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        List<String> queryTokens = tokenize(query);
        List<SymbolEntity> allSymbols = symbolRepository.findByAnalysisId(analysisId);

        // Preload metrics, findings, and relationships for fast in-memory matching
        List<SymbolMetricsEntity> allSymbolMetrics = symbolMetricsRepository.findByAnalysisId(analysisId);
        Map<UUID, SymbolMetricsEntity> symbolMetricsMap = allSymbolMetrics.stream()
                .collect(Collectors.toMap(SymbolMetricsEntity::getSymbolId, m -> m, (a, b) -> a));

        List<FileMetricsEntity> allFileMetrics = fileMetricsRepository.findByAnalysisId(analysisId);
        Map<String, FileMetricsEntity> fileMetricsMap = allFileMetrics.stream()
                .collect(Collectors.toMap(FileMetricsEntity::getFilePath, m -> m, (a, b) -> a));

        List<QualityFindingEntity> allQualityFindings = qualityFindingRepository.findByAnalysisId(analysisId);
        List<SecretFindingEntity> allSecretFindings = secretFindingRepository.findByAnalysisId(analysisId);
        List<SecurityFindingEntity> allSecurityFindings = securityFindingRepository != null
                ? securityFindingRepository.findByRepositoryId(repositoryId)
                : Collections.emptyList();
        List<RelationshipEntity> allRelationships = relationshipRepository.findByAnalysisId(analysisId);

        // Map caller counts by target FQN
        Map<String, Integer> callerCountMap = new HashMap<>();
        Map<UUID, Integer> calleeCountMap = new HashMap<>();

        for (RelationshipEntity rel : allRelationships) {
            if (rel.getRelationshipType() == RelationshipType.CALLS) {
                if (rel.getTargetFqn() != null) {
                    callerCountMap.merge(rel.getTargetFqn(), 1, Integer::sum);
                }
                if (rel.getSourceSymbolId() != null) {
                    calleeCountMap.merge(rel.getSourceSymbolId(), 1, Integer::sum);
                }
            }
        }

        List<DiscoveredCandidate> candidates = new ArrayList<>();

        for (SymbolEntity symbol : allSymbols) {
            // Focus on meaningful searchable units
            if (symbol.getKind() == SymbolKind.PACKAGE) {
                continue;
            }

            double relevance = calculateFunctionalRelevance(symbol, query, queryTokens);
            if (relevance < config.getThresholdRelevanceFloor()) {
                continue;
            }

            SymbolMetricsEntity sMetrics = symbolMetricsMap.get(symbol.getId());
            FileMetricsEntity fMetrics = fileMetricsMap.get(symbol.getFilePath());

            // Collect quality findings on this symbol or line range
            List<QualityFindingEntity> qFindings = allQualityFindings.stream()
                    .filter(q -> (symbol.getId().equals(q.getSymbolId()))
                            || (symbol.getFilePath().equals(q.getFilePath())
                            && q.getLineNumber() != null
                            && q.getLineNumber() >= symbol.getStartLine()
                            && q.getLineNumber() <= symbol.getEndLine()))
                    .collect(Collectors.toList());

            // Collect secret findings in candidate's file
            List<SecretFindingEntity> sFindings = allSecretFindings.stream()
                    .filter(s -> symbol.getFilePath().equals(s.getFilePath()))
                    .collect(Collectors.toList());

            // Collect security findings in candidate's file
            List<SecurityFindingEntity> secFindings = allSecurityFindings.stream()
                    .filter(sec -> symbol.getFilePath().equals(sec.getFilePath()))
                    .collect(Collectors.toList());

            int callers = symbol.getFqn() != null ? callerCountMap.getOrDefault(symbol.getFqn(), 0) : 0;
            int callees = calleeCountMap.getOrDefault(symbol.getId(), 0);

            candidates.add(new DiscoveredCandidate(
                    symbol,
                    relevance,
                    sMetrics,
                    fMetrics,
                    qFindings,
                    sFindings,
                    secFindings,
                    callers,
                    callees
            ));
        }

        // Sort descending by functional relevance and limit to topK
        return candidates.stream()
                .sorted(Comparator.comparingDouble((DiscoveredCandidate c) -> c.functionalRelevance).reversed())
                .limit(topK > 0 ? topK : 10)
                .collect(Collectors.toList());
    }

    private double calculateFunctionalRelevance(SymbolEntity symbol, String rawQuery, List<String> queryTokens) {
        String name = symbol.getName().toLowerCase();
        String lowerQuery = rawQuery.trim().toLowerCase();

        // Exact symbol name match
        if (name.equalsIgnoreCase(lowerQuery)) {
            return 1.0;
        }

        // Exact substring match
        if (name.contains(lowerQuery) || lowerQuery.contains(name)) {
            return 0.85;
        }

        // Tokenized match against symbol name, signature, and FQN
        List<String> symbolTokens = tokenize(symbol.getName() + " " + (symbol.getSignature() != null ? symbol.getSignature() : "") + " " + (symbol.getFqn() != null ? symbol.getFqn() : ""));
        if (queryTokens.isEmpty() || symbolTokens.isEmpty()) {
            return 0.0;
        }

        int matchedCount = 0;
        for (String qToken : queryTokens) {
            for (String sToken : symbolTokens) {
                if (sToken.equals(qToken) || sToken.contains(qToken) || qToken.contains(sToken)) {
                    matchedCount++;
                    break;
                }
            }
        }

        double tokenScore = (double) matchedCount / queryTokens.size();

        // Boost if symbol name specifically contains one of the key query tokens
        for (String qToken : queryTokens) {
            if (name.contains(qToken)) {
                tokenScore = Math.min(1.0, tokenScore + 0.15);
                break;
            }
        }

        return Math.min(1.0, Math.max(0.0, tokenScore));
    }

    public List<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        // Split camelCase and non-alphanumeric characters
        String splitCamel = CAMEL_CASE_PATTERN.matcher(text).replaceAll(" ");
        String[] rawTokens = splitCamel.toLowerCase().split("[^a-zA-Z0-9]+");

        List<String> tokens = new ArrayList<>();
        for (String t : rawTokens) {
            String trimmed = t.trim();
            if (trimmed.length() >= 2 && !STOPWORDS.contains(trimmed)) {
                tokens.add(trimmed);
            }
        }
        return tokens;
    }
}
