import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchitectureAnalysisView } from '../components/architecture/ArchitectureAnalysisView';
import * as archApi from '../api/architecture';
import { ArchitectureAnalysis, ArchitectureGraph } from '../types/architecture';

function mockPage<T>(items: T[]) {
  return {
    content: items,
    pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
    totalElements: items.length,
    totalPages: 1,
    last: true,
    size: 10,
    number: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    numberOfElements: items.length,
    first: true,
    empty: items.length === 0,
  };
}

describe('ArchitectureAnalysisView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockAnalysis: ArchitectureAnalysis = {
    id: 'arch-1',
    repositoryId: 'repo-1',
    analysisId: 'run-1',
    totalPackages: 4,
    totalClasses: 18,
    totalInterfaces: 2,
    totalDependencies: 5,
    cycleCount: 1,
    hotspotCount: 1,
    smellCount: 1,
    averageComplexity: 2.5,
    averageMaintainability: 84.0,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    packageMetrics: [
      {
        packageName: 'com.example.service',
        classCount: 6,
        interfaceCount: 1,
        afferentCoupling: 3,
        efferentCoupling: 2,
        instability: 0.4,
        couplingCategory: 'BALANCED',
      },
      {
        packageName: 'com.example.circularA',
        classCount: 2,
        interfaceCount: 0,
        afferentCoupling: 1,
        efferentCoupling: 1,
        instability: 0.5,
        couplingCategory: 'BALANCED',
      },
    ],
    cycles: [
      {
        members: ['com.example.circularA', 'com.example.circularB'],
        length: 2,
        cycleType: 'PACKAGE',
        edgeDescriptions: ['A -> B', 'B -> A'],
        sourceLocations: ['CircularA.java', 'CircularB.java'],
      },
    ],
    hotspots: [
      {
        symbolFqn: 'com.example.service.CentralService',
        filePath: 'src/main/java/com/example/service/CentralService.java',
        fanIn: 3,
        fanOut: 2,
        totalDegree: 5,
        hotspotType: 'HUB',
        description: 'Package has high afferent and efferent coupling, acting as a central routing hub.',
      },
    ],
    smells: [
      {
        smellType: 'CYCLIC_DEPENDENCY',
        severity: 'HIGH',
        affectedElement: 'com.example.circularA',
        description: 'Circular package dependency detected',
        remediation: 'Invert dependency using interfaces or introduce a shared domain abstraction.',
        metricsSnippet: 'Cycle length: 2',
      },
    ],
  };

  const mockGraph: ArchitectureGraph = {
    nodes: [
      {
        id: 'com.example.service',
        label: 'com.example.service',
        type: 'PACKAGE',
      },
      {
        id: 'com.example.circularA',
        label: 'com.example.circularA',
        type: 'PACKAGE',
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'com.example.circularA',
        target: 'com.example.circularB',
        relationshipType: 'PACKAGE_DEPENDENCY',
        weight: 1,
      },
    ],
  };

  it('renders architecture overview metrics and navigates subtabs', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    expect(screen.getByText(/Deterministic Architecture Intelligence/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Architecture/i })).toBeInTheDocument();

    await waitFor(() => {
      // Check KPI counters
      expect(screen.getByText('Packages')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Cycles')).toBeInTheDocument();
      expect(screen.getByText('Avg Complexity')).toBeInTheDocument();

      // Check package coupling table content (default tab)
      expect(screen.getByText('com.example.service')).toBeInTheDocument();
      expect(screen.getByText('com.example.circularA')).toBeInTheDocument();
    });

    // Switch to Cycles tab
    const cyclesTabButton = screen.getByRole('button', { name: /Cycles \(1\)/i });
    fireEvent.click(cyclesTabButton);

    await waitFor(() => {
      expect(screen.getByText(/Length: 2 nodes/i)).toBeInTheDocument();
      expect(screen.getAllByText('com.example.circularA').length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Hotspots tab
    const hotspotsTabButton = screen.getByRole('button', { name: /Hotspots \(1\)/i });
    fireEvent.click(hotspotsTabButton);

    await waitFor(() => {
      expect(screen.getByText('CENTRAL HUB')).toBeInTheDocument();
      expect(
        screen.getByText(/Package has high afferent and efferent coupling, acting as a central routing hub./i)
      ).toBeInTheDocument();
    });

    // Switch to Smells tab
    const smellsTabButton = screen.getByRole('button', { name: /Smells \(1\)/i });
    fireEvent.click(smellsTabButton);

    await waitFor(() => {
      expect(screen.getByText('CYCLIC_DEPENDENCY')).toBeInTheDocument();
      expect(
        screen.getByText(/Invert dependency using interfaces or introduce a shared domain abstraction./i)
      ).toBeInTheDocument();
    });

    // Switch to Dependency Graph tab
    const graphTabButton = screen.getByRole('button', { name: /Dependency Graph/i });
    fireEvent.click(graphTabButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search symbols...')).toBeInTheDocument();
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });
  });

  it('triggers a new architecture analysis scan', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([]));
    const analyzeSpy = vi.spyOn(archApi, 'analyzeArchitecture').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    const runButton = screen.getByRole('button', { name: /Analyze Architecture/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith('repo-1');
    });
  });
});
