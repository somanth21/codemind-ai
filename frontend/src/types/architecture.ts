export interface PackageCouplingMetrics {
  packageName: string;
  classCount: number;
  interfaceCount: number;
  afferentCoupling: number; // Ca
  efferentCoupling: number; // Ce
  instability: number;      // I = Ce / (Ca + Ce)
  couplingCategory: string; // HIGHLY_STABLE, BALANCED, HIGHLY_UNSTABLE
}

export interface DependencyCycle {
  members: string[];
  length: number;
  cycleType: 'CLASS' | 'PACKAGE';
  edgeDescriptions: string[];
  sourceLocations: string[];
}

export interface ArchitectureHotspot {
  symbolFqn: string;
  filePath: string;
  fanIn: number;
  fanOut: number;
  totalDegree: number;
  hotspotType: 'HUB' | 'HIGH_FAN_OUT' | 'CORE_ABSTRACTION';
  description: string;
}

export interface ArchitectureSmell {
  smellType: string;
  severity: string;
  affectedElement: string;
  description: string;
  remediation: string;
  metricsSnippet: string;
}

export interface ArchitectureAnalysis {
  id: string;
  repositoryId: string;
  analysisId: string;
  totalPackages: number;
  totalClasses: number;
  totalInterfaces: number;
  totalDependencies: number;
  cycleCount: number;
  hotspotCount: number;
  smellCount: number;
  averageComplexity: number;
  averageMaintainability: number;
  packageMetrics: PackageCouplingMetrics[];
  cycles: DependencyCycle[];
  hotspots: ArchitectureHotspot[];
  smells: ArchitectureSmell[];
  status: string;
  createdAt: string;
}

export interface ArchitectureGraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface ArchitectureGraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  weight: number;
  provenance?: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
}

export interface ArchitectureAnalysisRequest {
  analysisId?: string;
}
