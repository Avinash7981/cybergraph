// Application-level types (not React Flow specific)

export type NodeType =
  | 'INTERNET'
  | 'ROUTER'
  | 'FIREWALL'
  | 'SERVER'
  | 'DATABASE'
  | 'WORKSTATION'
  | 'IOT'
  | 'CLOUD'
  | 'ENDPOINT';

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EdgeStatus = 'ACTIVE' | 'ISOLATED';

export interface Network {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { nodes: number; edges: number };
}

export interface NetworkNode {
  id: string;
  networkId: string;
  name: string;
  type: NodeType;
  criticality: Criticality;
  vulnerabilityScore: number;
  positionX?: number | null;
  positionY?: number | null;
  status?: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
  lastSeen?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkEdge {
  id: string;
  networkId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceNode?: NetworkNode;
  targetNode?: NetworkNode;
  cost: number;
  risk: number;
  directed: boolean;
  status: EdgeStatus;
  createdAt: string;
}

export interface NetworkDetail extends Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// Algorithm result types
export interface BFSResult {
  algorithm: 'BFS';
  startNodeId: string;
  visitedNodes: string[];
  traversalOrder: string[];
  parent: Record<string, string | null>;
  reachable: string[];
  runtimeMs: number;
  theoreticalComplexity: { time: string; space: string };
  nodeNames: Record<string, string>;
}

export interface DFSResult {
  algorithm: 'DFS';
  startNodeId: string;
  visitedNodes: string[];
  traversalOrder: string[];
  parent: Record<string, string | null>;
  reachable: string[];
  runtimeMs: number;
  theoreticalComplexity: { time: string; space: string };
  nodeNames: Record<string, string>;
}

export interface DijkstraResult {
  algorithm: 'DIJKSTRA';
  sourceNodeId: string;
  targetNodeId: string;
  reachable: boolean;
  path: string[];
  totalCost: number | null;
  visitedNodes: string[];
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  runtimeMs: number;
  theoreticalComplexity: { time: string; space: string };
  nodeNames: Record<string, string>;
}

export interface ComparisonResult {
  nodeNames: Record<string, string>;
  bfs: BFSResult;
  dfs: DFSResult;
  dijkstra: DijkstraResult;
}

export interface NodeRiskResult {
  nodeId: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  components: {
    vulnerability: number;
    criticality: number;
    connectivity: number;
    exposure: number;
  };
}

export interface EdgeRiskResult {
  edgeId: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  components: {
    configuredRisk: number;
    sourceRisk: number;
    targetRisk: number;
    costFactor: number;
  };
}

export interface PathRiskResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  highestRiskNode: string | null;
  highestRiskEdge: string | null;
  nodes: NodeRiskResult[];
  edges: EdgeRiskResult[];
}

export interface NetworkRiskResult {
  network: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  nodes: NodeRiskResult[];
  edges: EdgeRiskResult[];
  criticalRiskNodes: string[];
  path: PathRiskResult | null;
  nodeNames?: Record<string, string>;
}

export interface MonitoringEvent {
  id: string;
  networkId: string;
  entityType: string;
  entityId: string;
  previousStatus: string;
  currentStatus: string;
  eventType: string;
  timestamp: string;
}

export interface SimulationResult {
  entryNodeId: string;
  targetNodeId?: string;
  targetReached: boolean;
  attackPath: string[];
  compromisedNodes: string[];
  atRiskNodes: string[];
  blockedNodes: string[];
  blockedEdges: string[];
  depth: number;
  totalCost: number;
  attackRisk: PathRiskResult | null;
  nodeNames: Record<string, string>;
}
