// Core graph types used by algorithms (independent of HTTP/DB/React)

export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  name: string;
  type: string;
  criticality: string;
  vulnerabilityScore: number;
  positionX?: number | null;
  positionY?: number | null;
}

export interface GraphEdge {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
  cost: number;
  risk: number;
  directed: boolean;
  status: 'ACTIVE' | 'ISOLATED';
}

export interface AdjacencyEntry {
  nodeId: NodeId;
  edgeId: string;
  cost: number;
  risk: number;
  directed: boolean;
}

export interface Graph {
  nodes: Map<NodeId, GraphNode>;
  edges: Map<string, GraphEdge>;
  // adjacency list: nodeId -> list of neighbor entries
  adjacency: Map<NodeId, AdjacencyEntry[]>;
}

export interface BFSResult {
  algorithm: 'BFS';
  startNodeId: NodeId;
  visitedNodes: NodeId[];
  traversalOrder: NodeId[];
  parent: Record<NodeId, NodeId | null>;
  reachable: NodeId[];
}

export interface DFSResult {
  algorithm: 'DFS';
  startNodeId: NodeId;
  visitedNodes: NodeId[];
  traversalOrder: NodeId[];
  parent: Record<NodeId, NodeId | null>;
  reachable: NodeId[];
}

export interface DijkstraResult {
  algorithm: 'DIJKSTRA';
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  reachable: boolean;
  path: NodeId[];
  totalCost: number;
  visitedNodes: NodeId[];
  distances: Record<NodeId, number>;
  previous: Record<NodeId, NodeId | null>;
}

export interface PathReconstructionResult {
  reachable: boolean;
  path: NodeId[];
  distance: number;
}
