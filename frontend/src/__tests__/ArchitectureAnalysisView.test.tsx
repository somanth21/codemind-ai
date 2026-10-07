import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchitectureAnalysisView } from '../components/architecture/ArchitectureAnalysisView';
import * as archApi from '../api/architecture';
import * as exportUtils from '../components/architecture/exportUtils';
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
      {
        id: 'com.example.circularB',
        label: 'com.example.circularB',
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

  it('renders interactive architecture graph hero, metric strip, signals, and explanations', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    expect(screen.getByText('ARCHITECTURE INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText('Visualize how your repository is structured and connected.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Architecture/i })).toBeInTheDocument();

    // 1. Overview KPI counters
    await waitFor(() => {
      const overviewStrip = screen.getByLabelText('Architecture Overview');
      expect(within(overviewStrip).getByText('Packages')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('Dependencies')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('Cycles')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('Hotspots')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('Coupling')).toBeInTheDocument();
    });

    // 2. Interactive Dependency Graph hero controls & view switcher
    await waitFor(() => {
      const diagram = screen.getByLabelText('Main Architecture Diagram');
      expect(diagram).toBeInTheDocument();
      expect(within(diagram).getByText('Overview')).toBeInTheDocument();
      expect(within(diagram).getByText('Dependencies')).toBeInTheDocument();
      expect(within(diagram).getByText(/Cycles \(1\)/i)).toBeInTheDocument();
      expect(within(diagram).getByText(/Hotspots \(1\)/i)).toBeInTheDocument();
    });

    // 3. Architecture Signals drawer
    expect(screen.getByText(/Architecture Signals/i)).toBeInTheDocument();
    expect(screen.getByText('Circular Dependency')).toBeInTheDocument();
    expect(screen.getAllByText(/com\.example\.circularA/).length).toBeGreaterThanOrEqual(1);

    // 4. Deterministic System Explanation
    expect(screen.getByText('How Your System Is Connected')).toBeInTheDocument();
    expect(screen.getByText(/com\.example\.service has the highest incoming coupling/i)).toBeInTheDocument();

    // 5. Package Metrics Table
    expect(screen.getByRole('button', { name: /Package Coupling/i })).toBeInTheDocument();
    expect(screen.getAllByText('com.example.service').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/com\.example\.circularA/).length).toBeGreaterThanOrEqual(1);
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

  it('displays sparse data note when graph has 2 or fewer nodes (Correction 2)', async () => {
    const sparseGraph: ArchitectureGraph = {
      nodes: [
        { id: 'pkg1', label: 'com.example.core', type: 'PACKAGE' },
      ],
      edges: [],
    };

    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(sparseGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture visibility is limited because only 1 package\/module relationships were detected/i)).toBeInTheDocument();
    });
  });

  it('allows selecting a package, viewing metrics in side inspector, and drilling down into package classes', async () => {
    const classLevelGraph: ArchitectureGraph = {
      nodes: [
        { id: 'com.example.service.UserService', label: 'UserService', type: 'CLASS', metadata: { package: 'com.example.service' } },
        { id: 'com.example.service.UserClient', label: 'UserClient', type: 'CLASS', metadata: { package: 'com.example.service' } },
        { id: 'com.example.controller.UserController', label: 'UserController', type: 'CLASS', metadata: { package: 'com.example.controller' } },
      ],
      edges: [
        { id: 'e1', source: 'com.example.controller.UserController', target: 'com.example.service.UserService', relationshipType: 'CALLS', weight: 1 },
      ],
    };

    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(classLevelGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    // 1. Verify package-level aggregation rendered by default
    await waitFor(() => {
      expect(screen.getByText(/Packages:\s*3/i)).toBeInTheDocument();
    });

    // 2. Select package in coupling table or graph to open side inspector
    const serviceRows = screen.getAllByText('com.example.service');
    fireEvent.click(serviceRows[0]);

    // Side inspector opens with package name, metrics, and Open Package button
    await waitFor(() => {
      expect(screen.getByText('PACKAGE MODULE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open Package/i })).toBeInTheDocument();
      expect(screen.getByText('Afferent (Ca)')).toBeInTheDocument();
      expect(screen.getByText('Efferent (Ce)')).toBeInTheDocument();
    });

    // 3. Drill down into package by clicking [Open Package]
    const openPkgBtn = screen.getByRole('button', { name: /Open Package/i });
    fireEvent.click(openPkgBtn);

    // Drilled down view displays breadcrumb navigation and package classes
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /All Packages/i })).toBeInTheDocument();
      expect(screen.getByText('UserService')).toBeInTheDocument();
      expect(screen.getByText('UserClient')).toBeInTheDocument();
    });

    // 4. Return to All Packages via breadcrumb
    const backBtn = screen.getByRole('button', { name: /All Packages/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/Packages:\s*3/i)).toBeInTheDocument();
    });
  });

  it('supports graph view modes: Overview, Dependencies, Cycles, and Hotspots', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Main Architecture Diagram')).toBeInTheDocument();
    });

    const diagram = screen.getByLabelText('Main Architecture Diagram');

    // Click Cycles view
    const cyclesBtn = within(diagram).getByRole('button', { name: /Cycles \(1\)/i });
    fireEvent.click(cyclesBtn);

    // Click Hotspots view
    const hotspotsBtn = within(diagram).getByRole('button', { name: /Hotspots \(1\)/i });
    fireEvent.click(hotspotsBtn);

    // Click Overview view
    const overviewBtn = within(diagram).getByRole('button', { name: /Overview/i });
    fireEvent.click(overviewBtn);

    // Zoom controls exist and can be clicked
    const zoomInBtn = within(diagram).getByRole('button', { name: /Zoom In/i });
    const zoomOutBtn = within(diagram).getByRole('button', { name: /Zoom Out/i });
    const fitBtn = within(diagram).getByRole('button', { name: /Fit to Screen/i });

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(fitBtn);
  });

  it('supports Architecture Intelligence 2.0 view modes: Components, Classes, Call Graph, Sequence, Data Flow, Entities, API Map, Security, Deployment', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Main Architecture Diagram')).toBeInTheDocument();
    });

    const diagram = screen.getByLabelText('Main Architecture Diagram');

    // Click Components view
    fireEvent.click(within(diagram).getByRole('button', { name: /Components/i }));
    await waitFor(() => {
      expect(screen.getByText(/5-tier architectural breakdown/i)).toBeInTheDocument();
    });

    // Click Classes view
    fireEvent.click(within(diagram).getByRole('button', { name: /Classes/i }));
    await waitFor(() => {
      expect(screen.getByText(/UML Class Specification/i)).toBeInTheDocument();
    });

    // Click Call Graph view
    fireEvent.click(within(diagram).getByRole('button', { name: /Call Graph/i }));
    await waitFor(() => {
      expect(screen.getByText(/Directed invocation call graph/i)).toBeInTheDocument();
    });

    // Click Sequence view
    fireEvent.click(within(diagram).getByRole('button', { name: /Sequence/i }));
    await waitFor(() => {
      expect(screen.getByText(/Sequence inferred from static call relationships/i)).toBeInTheDocument();
    });

    // Click Data Flow view
    fireEvent.click(within(diagram).getByRole('button', { name: /Data Flow/i }));
    await waitFor(() => {
      expect(screen.getByText(/Data Flow Architecture Pipeline/i)).toBeInTheDocument();
    });

    // Click Entities view
    fireEvent.click(within(diagram).getByRole('button', { name: /Entities/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entity-Relationship Model/i)).toBeInTheDocument();
    });

    // Click API Map view
    fireEvent.click(within(diagram).getByRole('button', { name: /API Map/i }));
    await waitFor(() => {
      expect(screen.getByText(/API Architecture Map/i)).toBeInTheDocument();
    });

    // Click Security view
    fireEvent.click(within(diagram).getByRole('button', { name: /Security/i }));
    await waitFor(() => {
      expect(screen.getByText(/Security Architecture & Trust Boundaries/i)).toBeInTheDocument();
    });

    // Click Deployment view
    fireEvent.click(within(diagram).getByRole('button', { name: /Deployment/i }));
    await waitFor(() => {
      expect(screen.getByText(/Deployment & Runtime Topology/i)).toBeInTheDocument();
    });
  });

  it('triggers PDF architecture report generation when export button clicked', async () => {
    vi.spyOn(archApi, 'getArchitectureAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(archApi, 'getArchitectureAnalysis').mockResolvedValue(mockAnalysis);
    vi.spyOn(archApi, 'getArchitectureGraph').mockResolvedValue(mockGraph);
    const exportPdfSpy = vi.spyOn(exportUtils, 'exportArchitectureReportPdf').mockResolvedValue(undefined);

    render(<ArchitectureAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export Report \(PDF\)/i })).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export Report \(PDF\)/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportPdfSpy).toHaveBeenCalledWith('repo-1', 'run-1');
    });
  });
});
