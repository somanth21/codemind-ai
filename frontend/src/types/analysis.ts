export type AnalysisStatus = 'NOT_ANALYZED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export type SymbolKind =
  | 'PACKAGE'
  | 'CLASS'
  | 'INTERFACE'
  | 'ENUM'
  | 'RECORD'
  | 'METHOD'
  | 'CONSTRUCTOR'
  | 'FIELD';

export type RelationshipType =
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'CALLS'
  | 'CREATES'
  | 'FIELD_ACCESS';

export type RelationshipConfidence = 'RESOLVED' | 'PARTIAL' | 'UNRESOLVED';

export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnalysisRun {
  id: string;
  repositoryId: string;
  status: AnalysisStatus;
  startedAt: string;
  completedAt?: string;
  filesAnalyzed: number;
  filesSkipped: number;
  errorCount: number;
  warningCount: number;
  totalLoc: number;
  totalClasses: number;
  totalMethods: number;
  averageComplexity: number;
  maintainabilityIndex: number;
  failureReason?: string;
  createdAt: string;
}

export interface SymbolItem {
  id: string;
  repositoryId: string;
  analysisId: string;
  filePath: string;
  fqn?: string;
  name: string;
  kind: SymbolKind;
  parentSymbolId?: string;
  startLine?: number;
  endLine?: number;
  visibility?: string;
  isStatic: boolean;
  isFinal: boolean;
  isAbstract: boolean;
  signature?: string;
  returnType?: string;
  parameterCount: number;
  docstring?: string;
}

export interface RelationshipItem {
  id: string;
  repositoryId: string;
  analysisId: string;
  sourceSymbolId?: string;
  targetSymbolId?: string;
  sourceFqn?: string;
  targetFqn?: string;
  relationshipType: RelationshipType;
  confidence: RelationshipConfidence;
  lineNumber?: number;
}

export interface FileMetricsItem {
  id: string;
  repositoryId: string;
  analysisId: string;
  filePath: string;
  loc: number;
  lloc: number;
  cyclomaticComplexity: number;
  classCount: number;
  methodCount: number;
  halsteadVolume: number;
  maintainabilityIndex: number;
}

export interface QualityFindingItem {
  id: string;
  repositoryId: string;
  analysisId: string;
  filePath: string;
  symbolId?: string;
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  lineNumber?: number;
  evidence?: string;
}

export interface SecretFindingItem {
  id: string;
  repositoryId: string;
  analysisId: string;
  filePath: string;
  ruleId: string;
  severity: Severity;
  confidence: string;
  lineNumber?: number;
  redactedEvidence: string;
}
