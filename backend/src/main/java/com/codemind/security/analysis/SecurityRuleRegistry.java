package com.codemind.security.analysis;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Registry of deterministic security analysis rules.
 */
@Component
public class SecurityRuleRegistry {

    private final List<SecurityRule> rules;
    private final Map<String, SecurityRule> ruleMap;

    public SecurityRuleRegistry(List<SecurityRule> rules) {
        this.rules = rules != null ? List.copyOf(rules) : Collections.emptyList();
        this.ruleMap = this.rules.stream()
                .collect(Collectors.toMap(SecurityRule::getRuleId, r -> r, (r1, r2) -> r1));
    }

    public List<SecurityRule> getRules() {
        return rules;
    }

    public Optional<SecurityRule> getRule(String ruleId) {
        return Optional.ofNullable(ruleMap.get(ruleId));
    }

    public int getRuleCount() {
        return rules.size();
    }
}
