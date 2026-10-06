export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecurityCategory =
  | 'SECRETS'
  | 'INJECTION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'CRYPTOGRAPHY'
  | 'INPUT_VALIDATION'
  | 'FILE_ACCESS'
  | 'NETWORK'
  | 'DESERIALIZATION'
  | 'ERROR_HANDLING'
  | 'DEPENDENCY'
  | 'CONFIGURATION';

export type FindingStatus = 'OPEN' | 'REVIEWED' | 'SUPPRESSED';

export interface SecurityAnalysis {
  id: string;
  repositoryId: string;
  analysisId: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  riskScore: number;
  status: string;
  createdAt: string;
}

export interface SecurityFinding {
  id: string;
  repositoryId: string;
  analysisId: string;
  securityAnalysisId?: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  category: SecurityCategory;
  message: string;
  remediation: string;
  filePath: string;
  lineNumber?: number;
  endLineNumber?: number;
  evidenceSnippet?: string;
  confidence: string;
  status: FindingStatus;
  createdAt: string;
}

export interface SecurityAnalysisRequest {
  analysisId?: string;
}
