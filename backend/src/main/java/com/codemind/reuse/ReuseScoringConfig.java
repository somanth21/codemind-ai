package com.codemind.reuse;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "codemind.reuse")
public class ReuseScoringConfig {

    private String configVersion = "v1.0";

    // Weights (summing to 1.0)
    private double weightFunctionalRelevance = 0.35;
    private double weightStructuralSimilarity = 0.15;
    private double weightMaintainability = 0.15;
    private double weightComplexity = 0.10;
    private double weightSecurity = 0.15;
    private double weightModificationEffort = 0.10;

    // Decision Thresholds
    private double thresholdDirectReuseScore = 0.75;
    private double thresholdDirectRelevance = 0.70;
    private double thresholdAdaptationScore = 0.50;
    private double thresholdAdaptationRelevance = 0.40;
    private double thresholdRelevanceFloor = 0.25;

    public String getConfigVersion() {
        return configVersion;
    }

    public void setConfigVersion(String configVersion) {
        this.configVersion = configVersion;
    }

    public double getWeightFunctionalRelevance() {
        return weightFunctionalRelevance;
    }

    public void setWeightFunctionalRelevance(double weightFunctionalRelevance) {
        this.weightFunctionalRelevance = weightFunctionalRelevance;
    }

    public double getWeightStructuralSimilarity() {
        return weightStructuralSimilarity;
    }

    public void setWeightStructuralSimilarity(double weightStructuralSimilarity) {
        this.weightStructuralSimilarity = weightStructuralSimilarity;
    }

    public double getWeightMaintainability() {
        return weightMaintainability;
    }

    public void setWeightMaintainability(double weightMaintainability) {
        this.weightMaintainability = weightMaintainability;
    }

    public double getWeightComplexity() {
        return weightComplexity;
    }

    public void setWeightComplexity(double weightComplexity) {
        this.weightComplexity = weightComplexity;
    }

    public double getWeightSecurity() {
        return weightSecurity;
    }

    public void setWeightSecurity(double weightSecurity) {
        this.weightSecurity = weightSecurity;
    }

    public double getWeightModificationEffort() {
        return weightModificationEffort;
    }

    public void setWeightModificationEffort(double weightModificationEffort) {
        this.weightModificationEffort = weightModificationEffort;
    }

    public double getThresholdDirectReuseScore() {
        return thresholdDirectReuseScore;
    }

    public void setThresholdDirectReuseScore(double thresholdDirectReuseScore) {
        this.thresholdDirectReuseScore = thresholdDirectReuseScore;
    }

    public double getThresholdDirectRelevance() {
        return thresholdDirectRelevance;
    }

    public void setThresholdDirectRelevance(double thresholdDirectRelevance) {
        this.thresholdDirectRelevance = thresholdDirectRelevance;
    }

    public double getThresholdAdaptationScore() {
        return thresholdAdaptationScore;
    }

    public void setThresholdAdaptationScore(double thresholdAdaptationScore) {
        this.thresholdAdaptationScore = thresholdAdaptationScore;
    }

    public double getThresholdAdaptationRelevance() {
        return thresholdAdaptationRelevance;
    }

    public void setThresholdAdaptationRelevance(double thresholdAdaptationRelevance) {
        this.thresholdAdaptationRelevance = thresholdAdaptationRelevance;
    }

    public double getThresholdRelevanceFloor() {
        return thresholdRelevanceFloor;
    }

    public void setThresholdRelevanceFloor(double thresholdRelevanceFloor) {
        this.thresholdRelevanceFloor = thresholdRelevanceFloor;
    }

    public String toJson() {
        return String.format(
                "{\"version\":\"%s\",\"weights\":{\"rel\":%.2f,\"struct\":%.2f,\"maint\":%.2f,\"comp\":%.2f,\"sec\":%.2f,\"effort\":%.2f}}",
                configVersion,
                weightFunctionalRelevance,
                weightStructuralSimilarity,
                weightMaintainability,
                weightComplexity,
                weightSecurity,
                weightModificationEffort
        );
    }
}
