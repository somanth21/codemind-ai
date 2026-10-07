import { describe, it, expect } from 'vitest';
import {
  aggregatePackageGraph,
  computeHierarchicalDagLayout,
  getPackageClasses,
  formatPackageLabel,
  extractPackageFromFqn,
} from '../components/architecture/architectureGraphModel';
import { ArchitectureGraph, ArchitectureAnalysis } from '../types/architecture';

describe('Architecture Graph Aggregation Model', () => {
  const sampleClassGraph: ArchitectureGraph = {
    nodes: [
      { id: 'com.example.controller.OrderController', label: 'OrderController', type: 'CLASS', metadata: { package: 'com.example.controller' } },
      { id: 'com.example.controller.PaymentController', label: 'PaymentController', type: 'CLASS', metadata: { package: 'com.example.controller' } },
      { id: 'com.example.service.OrderService', label: 'OrderService', type: 'CLASS', metadata: { package: 'com.example.service' } },
      { id: 'com.example.service.PaymentService', label: 'PaymentService', type: 'CLASS', metadata: { package: 'com.example.service' } },
      { id: 'com.example.repository.OrderRepository', label: 'OrderRepository', type: 'INTERFACE', metadata: { package: 'com.example.repository' } },
      { id: 'com.example.domain.Order', label: 'Order', type: 'RECORD', metadata: { package: 'com.example.domain' } },
    ],
    edges: [
      { id: 'e1', source: 'com.example.controller.OrderController', target: 'com.example.service.OrderService', relationshipType: 'CALLS', weight: 1 },
      { id: 'e2', source: 'com.example.controller.PaymentController', target: 'com.example.service.PaymentService', relationshipType: 'CALLS', weight: 1 },
      { id: 'e3', source: 'com.example.controller.OrderController', target: 'com.example.service.PaymentService', relationshipType: 'CALLS', weight: 1 },
      { id: 'e4', source: 'com.example.service.OrderService', target: 'com.example.repository.OrderRepository', relationshipType: 'CALLS', weight: 1 },
      { id: 'e5', source: 'com.example.service.OrderService', target: 'com.example.domain.Order', relationshipType: 'CREATES', weight: 1 },
      // Internal edge within service package:
      { id: 'e6', source: 'com.example.service.OrderService', target: 'com.example.service.PaymentService', relationshipType: 'CALLS', weight: 1 },
    ],
  };

  const sampleAnalysis: ArchitectureAnalysis = {
    id: 'arch-1',
    repositoryId: 'repo-1',
    analysisId: 'run-1',
    totalPackages: 4,
    totalClasses: 6,
    totalInterfaces: 1,
    totalDependencies: 6,
    cycleCount: 0,
    hotspotCount: 1,
    smellCount: 0,
    averageComplexity: 2.1,
    averageMaintainability: 82.5,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    packageMetrics: [
      { packageName: 'com.example.controller', classCount: 2, interfaceCount: 0, afferentCoupling: 0, efferentCoupling: 3, instability: 1.0, couplingCategory: 'HIGHLY_UNSTABLE' },
      { packageName: 'com.example.service', classCount: 2, interfaceCount: 0, afferentCoupling: 3, efferentCoupling: 2, instability: 0.4, couplingCategory: 'BALANCED' },
      { packageName: 'com.example.repository', classCount: 0, interfaceCount: 1, afferentCoupling: 1, efferentCoupling: 0, instability: 0.0, couplingCategory: 'HIGHLY_STABLE' },
      { packageName: 'com.example.domain', classCount: 1, interfaceCount: 0, afferentCoupling: 1, efferentCoupling: 0, instability: 0.0, couplingCategory: 'HIGHLY_STABLE' },
    ],
    cycles: [],
    hotspots: [
      { symbolFqn: 'com.example.service.PaymentService', filePath: 'PaymentService.java', fanIn: 2, fanOut: 0, totalDegree: 2, hotspotType: 'HUB', description: 'Central payment service' },
    ],
    smells: [],
  };

  it('1. Package-level graph is default: aggregates 6 class nodes into 4 package nodes', () => {
    const result = aggregatePackageGraph(sampleClassGraph, sampleAnalysis);
    expect(result.packages).toHaveLength(4);
    const pkgIds = result.packages.map((p) => p.id);
    expect(pkgIds).toContain('com.example.controller');
    expect(pkgIds).toContain('com.example.service');
    expect(pkgIds).toContain('com.example.repository');
    expect(pkgIds).toContain('com.example.domain');
  });

  it('2. Duplicate class relationships are aggregated into single weighted package edges', () => {
    const result = aggregatePackageGraph(sampleClassGraph, sampleAnalysis);
    // controller -> service had 3 class-level edges (e1, e2, e3), must be aggregated to 1 package edge with weight 3
    const controllerToService = result.edges.find(
      (e) => e.source === 'com.example.controller' && e.target === 'com.example.service'
    );
    expect(controllerToService).toBeDefined();
    expect(controllerToService?.weight).toBe(3);

    // Internal edges within the same package are excluded from inter-package edges
    const internalEdge = result.edges.find(
      (e) => e.source === 'com.example.service' && e.target === 'com.example.service'
    );
    expect(internalEdge).toBeUndefined();
  });

  it('3. No fake nodes are created: only real packages from data are represented', () => {
    const result = aggregatePackageGraph(sampleClassGraph, sampleAnalysis);
    expect(result.packages.every((p) => p.id.startsWith('com.example.'))).toBe(true);
    expect(result.packages.find((p) => p.id === 'fake.package')).toBeUndefined();
  });

  it('4. No fake edges are created: only real inter-package calls are aggregated', () => {
    const result = aggregatePackageGraph(sampleClassGraph, sampleAnalysis);
    // There are no edges from repository -> controller
    const fakeEdge = result.edges.find(
      (e) => e.source === 'com.example.repository' && e.target === 'com.example.controller'
    );
    expect(fakeEdge).toBeUndefined();
  });

  it('5. Hierarchical DAG Layout produces non-overlapping positions and positive bounding box', () => {
    const { packages, edges } = aggregatePackageGraph(sampleClassGraph, sampleAnalysis);
    const layout = computeHierarchicalDagLayout(packages, edges, 1000, 600);

    expect(layout.positions.size).toBe(4);
    expect(layout.bounds.maxX).toBeGreaterThan(layout.bounds.minX);
    expect(layout.bounds.maxY).toBeGreaterThan(layout.bounds.minY);

    // Verify controllers are positioned higher (smaller Y) than domain/repository
    const controllerPos = layout.positions.get('com.example.controller');
    const domainPos = layout.positions.get('com.example.domain');
    expect(controllerPos).toBeDefined();
    expect(domainPos).toBeDefined();
    expect(controllerPos!.y).toBeLessThan(domainPos!.y);
  });

  it('6. Hierarchical Drill-Down: extracts classes for a specific package with internal/external edges', () => {
    const serviceDetails = getPackageClasses('com.example.service', sampleClassGraph);
    expect(serviceDetails.classes).toHaveLength(2);
    expect(serviceDetails.classes.map((c) => c.label)).toEqual(['OrderService', 'PaymentService']);

    // Internal edge (OrderService -> PaymentService)
    expect(serviceDetails.internalEdges).toHaveLength(1);
    // Outgoing edges (to repository and domain)
    expect(serviceDetails.outgoingEdges).toHaveLength(2);
    // Incoming edges (from controllers)
    expect(serviceDetails.incomingEdges).toHaveLength(3);
  });

  it('7. Helper utilities: extracts package FQN and formats labels cleanly', () => {
    expect(extractPackageFromFqn('com.codemind.web.AppController#handle()')).toBe('com.codemind.web');
    expect(extractPackageFromFqn('SingleClass')).toBe('default');
    expect(formatPackageLabel('com.khetai.billing.service.impl')).toBe('billing.service.impl');
  });
});
