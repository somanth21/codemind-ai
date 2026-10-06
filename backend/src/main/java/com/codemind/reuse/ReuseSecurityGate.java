package com.codemind.reuse;

import com.codemind.domain.model.SecurityGateStatus;
import com.codemind.domain.model.Severity;
import org.springframework.stereotype.Component;

@Component
public class ReuseSecurityGate {

    public SecurityGateStatus evaluate(ReuseCandidateService.DiscoveredCandidate candidate, double securityScore) {
        // Zero tolerance: Any secret in the candidate file blocks reuse
        if (candidate.secretFindings != null && !candidate.secretFindings.isEmpty()) {
            return SecurityGateStatus.BLOCKED;
        }

        // Critical or High security findings strictly block reuse
        if (candidate.securityFindings != null && candidate.securityFindings.stream()
                .anyMatch(s -> s.getSeverity() == Severity.CRITICAL || s.getSeverity() == Severity.HIGH)) {
            return SecurityGateStatus.BLOCKED;
        }

        // Medium security findings require caution
        if (candidate.securityFindings != null && candidate.securityFindings.stream()
                .anyMatch(s -> s.getSeverity() == Severity.MEDIUM)) {
            return SecurityGateStatus.CAUTION;
        }

        // Critical or High quality findings strictly block reuse
        if (candidate.qualityFindings != null && candidate.qualityFindings.stream()
                .anyMatch(q -> q.getSeverity() == Severity.CRITICAL || q.getSeverity() == Severity.HIGH)) {
            return SecurityGateStatus.BLOCKED;
        }

        // Medium quality findings or low security score require caution
        if (candidate.qualityFindings != null && candidate.qualityFindings.stream()
                .anyMatch(q -> q.getSeverity() == Severity.MEDIUM)) {
            return SecurityGateStatus.CAUTION;
        }

        if (securityScore < 0.60) {
            return SecurityGateStatus.CAUTION;
        }

        return SecurityGateStatus.SAFE;
    }

    public boolean isEligibleForDirectReuse(SecurityGateStatus status) {
        return status == SecurityGateStatus.SAFE;
    }
}
