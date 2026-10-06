export type ReuseDecision =
  | 'REUSE_DIRECTLY'
  | 'REUSE_WITH_ADAPTATION'
  | 'COMPOSE_EXISTING_COMPONENTS'
  | 'EXTEND_EXISTING_COMPONENT'
  | 'CREATE_NEW';

export type CandidateType = 'DIRECT_REUSE' | 'ADAPT' | 'COMPOSE' | 'EXTEND' | 'REJECT';

export type SecurityGateStatus = 'SAFE' | 'CAUTION' | 'BLOCKED';

export type ReuseEvidenceType =
  | 'SYMBOL_DECLARATION'
  | 'CALLER_USAGE'
  | 'CALLEE_DEPENDENCY'
  | 'QUALITY_METRIC'
  | 'SECURITY_FINDING'
  | 'DUPLICATION_SIGNAL';

export interface ReuseEvidence {
  id: string;
  candidateId: string;
  evidenceType: ReuseEvidenceType;
  description: string;
  sourceFile?: string;
  startLine?: number;
  endLine?: number;
  metricValue?: number;
}

export interface ReuseCandidate {
  id: string;
  symbolId?: string;
  filePath: string;
  symbolName: string;
  symbolKind: string;
  signature?: string;
  startLine: number;
  endLine: number;
  candidateType: CandidateType;
  overallScore: number;
  functionalRelevance: number;
  structuralSimilarity: number;
  maintainabilityScore: number;
  complexityPenalty: number;
  securityScore: number;
  modificationEffort: number;
  dependencyImpact: number;
  duplicationRisk: number;
  securityGate: SecurityGateStatus;
  explanation?: string;
  evidence?: ReuseEvidence[];
  positiveSignals?: string[];
  negativeSignals?: string[];
}

export interface ReuseAnalysis {
  id: string;
  repositoryId: string;
  analysisId: string;
  query: string;
  decision: ReuseDecision;
  overallScore: number;
  confidence: number;
  securityStatus: SecurityGateStatus;
  explanation: string;
  configVersion: string;
  weightsJson?: string;
  createdAt: string;
  candidates: ReuseCandidate[];
}

export interface ReuseAnalysisRequest {
  query: string;
  limit?: number;
}
