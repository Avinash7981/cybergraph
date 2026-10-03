import { Graph, GraphNode, GraphEdge } from './types';
import { calculateNetworkRisk } from './risk';

export interface SimulationParams {
  entryNodeId: string;
  targetNodeId?: string;
  maxDepth: number;
  blockedNodeIds?: string[];
  blockedEdgeIds?: string[];
}

export interface SimulationResult {
  entryNodeId: string;
  targetNodeId?: string;
  targetReached: boolean;
  attackPath: string[]; // only filled if targetReached
  compromisedNodes: string[];
  atRiskNodes: string[];
  blockedNodes: string[];
  blockedEdges: string[];
  depth: number;
  totalCost: number;
  attackRisk: any; // calculated path risk
}

export function simulateAttack(graph: Graph, params: SimulationParams): SimulationResult {
  if (!graph.nodes.has(params.entryNodeId)) {
    throw new Error('Entry node not found in graph');
  }
  if (params.targetNodeId && !graph.nodes.has(params.targetNodeId)) {
    throw new Error('Target node not found in graph');
  }
  if (params.maxDepth < 0) {
    throw new Error('maxDepth must be non-negative');
  }

  const blockedNodes = new Set(params.blockedNodeIds || []);
  const blockedEdges = new Set(params.blockedEdgeIds || []);
  
  if (blockedNodes.has(params.entryNodeId)) {
    throw new Error('Entry node is blocked');
  }

  // State
  const compromised = new Set<string>([params.entryNodeId]);
  const atRisk = new Set<string>();
  const parent = new Map<string, string>(); // for path reconstruction
  const edgeUsed = new Map<string, string>(); // node -> edgeId used to reach it
  const nodeDepth = new Map<string, number>();
  
  nodeDepth.set(params.entryNodeId, 0);

  // BFS Queue
  const queue: string[] = [params.entryNodeId];
  let targetReached = false;
  let maxDepthReached = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = nodeDepth.get(currentId)!;

    maxDepthReached = Math.max(maxDepthReached, currentDepth);

    if (params.targetNodeId && currentId === params.targetNodeId) {
      targetReached = true;
      break;
    }

    if (currentDepth >= params.maxDepth) {
      continue;
    }

    // Explore neighbors
    const outgoingEdges = Array.from(graph.edges.values()).filter(
      (e) => e.sourceId === currentId && e.status === 'ACTIVE'
    );
    const undirectedIncomingEdges = Array.from(graph.edges.values()).filter(
      (e) => e.targetId === currentId && e.status === 'ACTIVE' && !e.directed
    );

    const validEdges = [...outgoingEdges, ...undirectedIncomingEdges];

    for (const edge of validEdges) {
      if (blockedEdges.has(edge.id)) continue;

      const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;

      if (blockedNodes.has(neighborId)) {
        continue;
      }

      if (!compromised.has(neighborId)) {
        compromised.add(neighborId);
        parent.set(neighborId, currentId);
        edgeUsed.set(neighborId, edge.id);
        nodeDepth.set(neighborId, currentDepth + 1);
        queue.push(neighborId);
      }
    }
  }

  // Find at-risk nodes: adjacent to any compromised node but not compromised themselves.
  // Wait, the simulation stops BFS either at maxDepth or when target is reached.
  // Any node adjacent to the compromised set (including valid edges but maybe blocked or beyond maxDepth)
  // that is NOT compromised is considered at risk, UNLESS it's blocked.
  for (const compNode of compromised) {
    const outgoing = Array.from(graph.edges.values()).filter(e => e.sourceId === compNode && e.status === 'ACTIVE');
    const incomingUndir = Array.from(graph.edges.values()).filter(e => e.targetId === compNode && e.status === 'ACTIVE' && !e.directed);
    
    for (const edge of [...outgoing, ...incomingUndir]) {
      if (blockedEdges.has(edge.id)) continue;
      const neighbor = edge.sourceId === compNode ? edge.targetId : edge.sourceId;
      if (!compromised.has(neighbor) && !blockedNodes.has(neighbor)) {
        atRisk.add(neighbor);
      }
    }
  }

  // Reconstruct path if target is reached
  let attackPath: string[] = [];
  let totalCost = 0;
  
  if (targetReached && params.targetNodeId) {
    let curr = params.targetNodeId;
    while (curr) {
      attackPath.unshift(curr);
      const eId = edgeUsed.get(curr);
      if (eId) {
        const edge = graph.edges.get(eId);
        if (edge) totalCost += edge.cost;
      }
      curr = parent.get(curr)!;
    }
  }

  // Calculate simulated attack risk using existing engine
  const networkRisk = calculateNetworkRisk(graph, targetReached ? attackPath : undefined);
  
  return {
    entryNodeId: params.entryNodeId,
    targetNodeId: params.targetNodeId,
    targetReached,
    attackPath,
    compromisedNodes: Array.from(compromised),
    atRiskNodes: Array.from(atRisk),
    blockedNodes: Array.from(blockedNodes),
    blockedEdges: Array.from(blockedEdges),
    depth: targetReached && params.targetNodeId ? nodeDepth.get(params.targetNodeId)! : maxDepthReached,
    totalCost,
    attackRisk: targetReached ? networkRisk.path : null
  };
}
