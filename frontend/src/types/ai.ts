export interface Claim {
  claim: string;
  evidenceIds: string[];
}

export interface EvidenceItem {
  evidenceId: string;
  filePath: string;
  symbolName: string;
  startLine: number;
  endLine: number;
  evidenceType: string;
  deterministicScore?: number;
  sanitizedSnippet?: string;
}

export interface AiReasoningResponse {
  id: string;
  repositoryId: string;
  reuseAnalysisId?: string;
  requestType: string;
  provider: string;
  model: string;
  summary: string;
  recommendation: string;
  reasoning: Claim[];
  limitations: string[];
  confidence: number;
  evidence: EvidenceItem[];
  contextChars: number;
  contextTruncated: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  citationCoverage: number;
  grounded: boolean;
  securityGatePreserved: boolean;
  createdAt: string;
}

export interface ExplainReusePayload {
  reuseAnalysisId?: string;
  candidateId?: string;
  developerQuestion?: string;
}

export interface ExplainEvidencePayload {
  query: string;
  analysisId?: string;
  limit?: number;
}
