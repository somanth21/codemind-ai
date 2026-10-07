import {
  ArchitectureGraph,
  ArchitectureGraphNode,
  ArchitectureGraphEdge,
  ArchitectureAnalysis,
  PackageCouplingMetrics,
} from '../../types/architecture';

export interface AggregatedPackageNode {
  id: string; // package name e.g. "com.khetai.controller"
  label: string; // package simple or formatted name
  packageName: string;
  type: 'PACKAGE';
  classCount: number;
  interfaceCount: number;
  afferentCoupling: number; // Ca
  efferentCoupling: number; // Ce
  instability: number;      // I
  couplingCategory?: string;
  isHotspot: boolean;
  isInCycle: boolean;
  classes: ArchitectureGraphNode[];
}

export interface AggregatedPackageEdge {
  id: string;
  source: string; // source package
  target: string; // target package
  weight: number; // total class-level dependencies
  relationshipTypes: string[];
  sampleDetails: Array<{ sourceClass: string; targetClass: string; type: string }>;
}

export interface AggregatedGraph {
  packages: AggregatedPackageNode[];
  edges: AggregatedPackageEdge[];
  isAlreadyPackageLevel: boolean;
}

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayoutResult {
  width: number;
  height: number;
  positions: Map<string, LayoutPosition>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Extracts a Java/Kotlin-style package name from an FQN.
 */
export function extractPackageFromFqn(fqn: string): string {
  if (!fqn) return 'default';
  // Strip any method or member references like #method or (args)
  const clean = fqn.split('#')[0].split('(')[0];
  const lastDot = clean.lastIndexOf('.');
  return lastDot > 0 ? clean.substring(0, lastDot) : 'default';
}

/**
 * Formats a long package name for display (e.g. "c.k.controller" or last segments).
 */
export function formatPackageLabel(packageName: string): string {
  if (!packageName || packageName === 'default') return 'default';
  const parts = packageName.split('.');
  if (parts.length <= 3) return packageName;
  // If long like com.example.project.service.impl, show last 2 or 3 segments
  return parts.slice(-3).join('.');
}

/**
 * Aggregates class-level nodes and edges into package-level nodes and edges.
 * Never creates synthetic or fake nodes/edges.
 */
export function aggregatePackageGraph(
  graph: ArchitectureGraph,
  analysis?: ArchitectureAnalysis | null
): AggregatedGraph {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  // Check if nodes are already PACKAGE type (e.g. from tests or package-level APIs)
  const allAlreadyPackages = nodes.length > 0 && nodes.every((n) => n.type.toUpperCase() === 'PACKAGE');

  const cyclePackages = new Set<string>();
  (analysis?.cycles || []).forEach((c) => {
    c.members.forEach((m) => {
      cyclePackages.add(m);
      cyclePackages.add(extractPackageFromFqn(m));
    });
  });

  const hotspotPackages = new Set<string>();
  (analysis?.hotspots || []).forEach((h) => {
    hotspotPackages.add(h.symbolFqn);
    hotspotPackages.add(extractPackageFromFqn(h.symbolFqn));
  });

  const packageMetricsMap = new Map<string, PackageCouplingMetrics>();
  (analysis?.packageMetrics || []).forEach((pm) => {
    packageMetricsMap.set(pm.packageName, pm);
  });

  if (allAlreadyPackages) {
    // Graph is already at package level
    const packages: AggregatedPackageNode[] = nodes.map((n) => {
      const pm = packageMetricsMap.get(n.id) || packageMetricsMap.get(n.label);
      return {
        id: n.id,
        label: n.label,
        packageName: n.id,
        type: 'PACKAGE',
        classCount: pm ? pm.classCount : 1,
        interfaceCount: pm ? pm.interfaceCount : 0,
        afferentCoupling: pm ? pm.afferentCoupling : 0,
        efferentCoupling: pm ? pm.efferentCoupling : 0,
        instability: pm ? pm.instability : 0,
        couplingCategory: pm?.couplingCategory,
        isHotspot: hotspotPackages.has(n.id) || hotspotPackages.has(n.label),
        isInCycle: cyclePackages.has(n.id) || cyclePackages.has(n.label),
        classes: [],
      };
    });

    const packageEdges: AggregatedPackageEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight || 1,
      relationshipTypes: [e.relationshipType || 'DEPENDENCY'],
      sampleDetails: [],
    }));

    return {
      packages,
      edges: packageEdges,
      isAlreadyPackageLevel: true,
    };
  }

  // Map each class node to its package
  const classToPackageMap = new Map<string, string>();
  const packageToClassesMap = new Map<string, ArchitectureGraphNode[]>();

  nodes.forEach((node) => {
    let pkg = 'default';
    if (node.metadata?.package && typeof node.metadata.package === 'string') {
      pkg = node.metadata.package;
    } else {
      pkg = extractPackageFromFqn(node.id || node.label);
    }

    classToPackageMap.set(node.id, pkg);
    classToPackageMap.set(node.label, pkg);

    if (!packageToClassesMap.has(pkg)) {
      packageToClassesMap.set(pkg, []);
    }
    packageToClassesMap.get(pkg)!.push(node);
  });

  // Also include any packages from packageMetrics that might have had 0 class nodes in graph
  (analysis?.packageMetrics || []).forEach((pm) => {
    if (!packageToClassesMap.has(pm.packageName)) {
      packageToClassesMap.set(pm.packageName, []);
    }
  });

  // Build AggregatedPackageNode for each unique package
  const packages: AggregatedPackageNode[] = Array.from(packageToClassesMap.entries()).map(
    ([pkgName, classes]) => {
      const pm = packageMetricsMap.get(pkgName);
      const isHot =
        hotspotPackages.has(pkgName) ||
        classes.some((c) => hotspotPackages.has(c.id) || hotspotPackages.has(c.label));
      const inCyc =
        cyclePackages.has(pkgName) ||
        classes.some((c) => cyclePackages.has(c.id) || cyclePackages.has(c.label));

      const classCount = pm ? pm.classCount : classes.filter((c) => c.type !== 'INTERFACE').length;
      const interfaceCount = pm
        ? pm.interfaceCount
        : classes.filter((c) => c.type === 'INTERFACE').length;

      return {
        id: pkgName,
        label: formatPackageLabel(pkgName),
        packageName: pkgName,
        type: 'PACKAGE',
        classCount: Math.max(classCount, classes.length),
        interfaceCount,
        afferentCoupling: pm ? pm.afferentCoupling : 0,
        efferentCoupling: pm ? pm.efferentCoupling : 0,
        instability: pm ? pm.instability : 0,
        couplingCategory: pm?.couplingCategory,
        isHotspot: isHot,
        isInCycle: inCyc,
        classes,
      };
    }
  );

  const packageSet = new Set(packages.map((p) => p.id));

  // Aggregate class-level edges into package edges
  const edgeAccumulator = new Map<
    string,
    {
      source: string;
      target: string;
      weight: number;
      types: Set<string>;
      samples: Array<{ sourceClass: string; targetClass: string; type: string }>;
    }
  >();

  edges.forEach((edge) => {
    const srcPkg = classToPackageMap.get(edge.source) || extractPackageFromFqn(edge.source);
    const tgtPkg = classToPackageMap.get(edge.target) || extractPackageFromFqn(edge.target);

    // Skip self-package dependencies in inter-package diagram
    if (!srcPkg || !tgtPkg || srcPkg === tgtPkg) {
      return;
    }

    if (!packageSet.has(srcPkg) || !packageSet.has(tgtPkg)) {
      return;
    }

    const key = `${srcPkg}==>${tgtPkg}`;
    if (!edgeAccumulator.has(key)) {
      edgeAccumulator.set(key, {
        source: srcPkg,
        target: tgtPkg,
        weight: 0,
        types: new Set<string>(),
        samples: [],
      });
    }

    const acc = edgeAccumulator.get(key)!;
    acc.weight += edge.weight || 1;
    if (edge.relationshipType) acc.types.add(edge.relationshipType);
    if (acc.samples.length < 5) {
      acc.samples.push({
        sourceClass: edge.source,
        targetClass: edge.target,
        type: edge.relationshipType || 'DEPENDENCY',
      });
    }
  });

  const packageEdges: AggregatedPackageEdge[] = Array.from(edgeAccumulator.entries()).map(
    ([key, acc]) => ({
      id: key,
      source: acc.source,
      target: acc.target,
      weight: acc.weight,
      relationshipTypes: Array.from(acc.types),
      sampleDetails: acc.samples,
    })
  );

  return {
    packages,
    edges: packageEdges,
    isAlreadyPackageLevel: false,
  };
}

/**
 * Assigns an architectural rank to a package based on naming heuristics and coupling.
 * Rank 0: Entry / Presentation (controller, api, web)
 * Rank 1: Business logic (service, manager, handler)
 * Rank 2: Data access / Clients (repository, dao, client, gateway)
 * Rank 3: Domain / Entities (model, entity, domain, dto)
 * Rank 4: Infrastructure / Common (config, util, common, shared)
 */
export function getArchitecturalLayerRank(packageName: string, afferent: number, efferent: number): number {
  const lower = packageName.toLowerCase();

  if (
    lower.includes('controller') ||
    lower.includes('resource') ||
    lower.includes('endpoint') ||
    lower.includes('.api') ||
    lower.includes('.web') ||
    lower.includes('.rest')
  ) {
    return 0;
  }

  if (
    lower.includes('service') ||
    lower.includes('manager') ||
    lower.includes('handler') ||
    lower.includes('orchestrat') ||
    lower.includes('usecase') ||
    lower.includes('workflow')
  ) {
    return 1;
  }

  if (
    lower.includes('repository') ||
    lower.includes('repo') ||
    lower.includes('dao') ||
    lower.includes('client') ||
    lower.includes('gateway') ||
    lower.includes('store') ||
    lower.includes('database') ||
    lower.includes('db')
  ) {
    return 2;
  }

  if (
    lower.includes('entity') ||
    lower.includes('model') ||
    lower.includes('domain') ||
    lower.includes('dto') ||
    lower.includes('vo') ||
    lower.includes('schema') ||
    lower.includes('pojo')
  ) {
    return 3;
  }

  if (
    lower.includes('config') ||
    lower.includes('util') ||
    lower.includes('common') ||
    lower.includes('constant') ||
    lower.includes('exception') ||
    lower.includes('security') ||
    lower.includes('shared') ||
    lower.includes('support')
  ) {
    return 4;
  }

  // Fallback heuristic based on coupling:
  // High efferent (depends on many) -> higher rank (top)
  // High afferent (called by many) -> lower rank (foundational)
  if (efferent > afferent && efferent > 0) return 1;
  if (afferent > efferent && afferent > 0) return 3;
  return 2;
}

/**
 * Computes a clean hierarchical Layered DAG layout with collision avoidance.
 * Generates positions and exact bounding box for fit-to-screen.
 */
export function computeHierarchicalDagLayout(
  packages: AggregatedPackageNode[],
  _edges: AggregatedPackageEdge[],
  canvasWidth = 1100,
  canvasHeight = 650
): GraphLayoutResult {
  const positions = new Map<string, LayoutPosition>();

  if (packages.length === 0) {
    return {
      width: canvasWidth,
      height: canvasHeight,
      positions,
      bounds: { minX: 0, maxX: canvasWidth, minY: 0, maxY: canvasHeight },
    };
  }

  if (packages.length === 1) {
    const pkg = packages[0];
    const w = 180;
    const h = 58;
    positions.set(pkg.id, {
      x: canvasWidth / 2 - w / 2,
      y: canvasHeight / 2 - h / 2,
      width: w,
      height: h,
    });
    return {
      width: canvasWidth,
      height: canvasHeight,
      positions,
      bounds: { minX: canvasWidth / 2 - w / 2, maxX: canvasWidth / 2 + w / 2, minY: canvasHeight / 2 - h / 2, maxY: canvasHeight / 2 + h / 2 },
    };
  }

  // 1. Group packages into layer ranks
  const layers = new Map<number, AggregatedPackageNode[]>();
  packages.forEach((pkg) => {
    const rank = getArchitecturalLayerRank(pkg.id, pkg.afferentCoupling, pkg.efferentCoupling);
    if (!layers.has(rank)) {
      layers.set(rank, []);
    }
    layers.get(rank)!.push(pkg);
  });

  const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);

  // 2. Calculate vertical and horizontal spacing
  const nodeWidth = 180;
  const nodeHeight = 56;
  const horizontalGap = 32;
  const rankCount = Math.max(sortedRanks.length, 1);
  const verticalGap = Math.max(100, Math.min(150, Math.floor((canvasHeight - 120) / Math.max(rankCount - 1, 1))));

  let overallMinX = Infinity;
  let overallMaxX = -Infinity;
  let overallMinY = Infinity;
  let overallMaxY = -Infinity;

  const startY = 60;

  sortedRanks.forEach((rank, rankIndex) => {
    const layerNodes = layers.get(rank)!;
    // Sort layer nodes by class count to keep largest central
    layerNodes.sort((a, b) => b.classCount - a.classCount);

    const countInLayer = layerNodes.length;
    const layerTotalWidth = countInLayer * nodeWidth + (countInLayer - 1) * horizontalGap;
    const startX = Math.max(40, (canvasWidth - layerTotalWidth) / 2);
    const y = startY + rankIndex * verticalGap;

    layerNodes.forEach((node, nodeIndex) => {
      const x = startX + nodeIndex * (nodeWidth + horizontalGap);

      positions.set(node.id, {
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
      });

      overallMinX = Math.min(overallMinX, x);
      overallMaxX = Math.max(overallMaxX, x + nodeWidth);
      overallMinY = Math.min(overallMinY, y);
      overallMaxY = Math.max(overallMaxY, y + nodeHeight);
    });
  });

  // Calculate tight bounding box with padding
  const padding = 50;
  const bounds = {
    minX: Math.max(0, overallMinX - padding),
    maxX: Math.max(canvasWidth, overallMaxX + padding),
    minY: Math.max(0, overallMinY - padding),
    maxY: Math.max(canvasHeight, overallMaxY + padding),
  };

  return {
    width: Math.max(canvasWidth, bounds.maxX),
    height: Math.max(canvasHeight, bounds.maxY),
    positions,
    bounds,
  };
}

/**
 * Extracts class details and relationships for a drilled-down package.
 */
export function getPackageClasses(
  packageName: string,
  graph: ArchitectureGraph
): {
  classes: ArchitectureGraphNode[];
  internalEdges: ArchitectureGraphEdge[];
  outgoingEdges: ArchitectureGraphEdge[];
  incomingEdges: ArchitectureGraphEdge[];
} {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const pkgClasses = nodes.filter((n) => {
    if (n.metadata?.package === packageName) return true;
    return extractPackageFromFqn(n.id) === packageName || extractPackageFromFqn(n.label) === packageName;
  });

  const classIds = new Set(pkgClasses.map((c) => c.id));
  const classLabels = new Set(pkgClasses.map((c) => c.label));

  const isClassInPackage = (id: string) => classIds.has(id) || classLabels.has(id);

  const internalEdges: ArchitectureGraphEdge[] = [];
  const outgoingEdges: ArchitectureGraphEdge[] = [];
  const incomingEdges: ArchitectureGraphEdge[] = [];

  edges.forEach((edge) => {
    const srcIn = isClassInPackage(edge.source);
    const tgtIn = isClassInPackage(edge.target);

    if (srcIn && tgtIn) {
      internalEdges.push(edge);
    } else if (srcIn && !tgtIn) {
      outgoingEdges.push(edge);
    } else if (!srcIn && tgtIn) {
      incomingEdges.push(edge);
    }
  });

  return {
    classes: pkgClasses,
    internalEdges,
    outgoingEdges,
    incomingEdges,
  };
}

/**
 * Computes a clean 2D grid/flow layout for classes within a drilled-down package.
 */
export function computeClassLayout(
  classes: ArchitectureGraphNode[],
  canvasWidth = 900,
  _canvasHeight = 500
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  if (classes.length === 0) return positions;

  const cardWidth = 190;
  const cardHeight = 52;
  const gapX = 24;
  const gapY = 24;
  const paddingX = 40;
  const paddingY = 40;

  const usableWidth = canvasWidth - paddingX * 2;
  const cols = Math.max(1, Math.min(4, Math.floor(usableWidth / (cardWidth + gapX))));

  classes.forEach((cls, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const x = paddingX + col * (cardWidth + gapX);
    const y = paddingY + row * (cardHeight + gapY);

    positions.set(cls.id, {
      x,
      y,
      width: cardWidth,
      height: cardHeight,
    });
  });

  return positions;
}
