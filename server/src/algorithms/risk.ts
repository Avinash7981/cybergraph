import { Graph, NodeId, GraphNode, GraphEdge } from './types';
import { bfs } from './bfs';

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
}

function getLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score < 2.5) return 'LOW';
  if (score < 5.0) return 'MEDIUM';
  if (score < 7.5) return 'HIGH';
  return 'CRITICAL';
}

function mapCriticality(crit: string): number {
  switch (crit) {
    case 'LOW': return 2.5;
    case 'MEDIUM': return 5.0;
    case 'HIGH': return 7.5;
    case 'CRITICAL': return 10.0;
    default: return 5.0;
  }
}

export function calculateNodeRisk(graph: Graph): Map<NodeId, NodeRiskResult> {
  const results = new Map<NodeId, NodeRiskResult>();
  
  if (graph.nodes.size === 0) return results;

  // 1. Calculate connectivity (degrees)
  const inDegrees = new Map<NodeId, number>();
  const outDegrees = new Map<NodeId, number>();
  for (const nodeId of graph.nodes.keys()) {
    inDegrees.set(nodeId, 0);
    outDegrees.set(nodeId, 0);
  }

  for (const edge of graph.edges.values()) {
    if (edge.status === 'ISOLATED') continue;
    outDegrees.set(edge.sourceId, (outDegrees.get(edge.sourceId) || 0) + 1);
    inDegrees.set(edge.targetId, (inDegrees.get(edge.targetId) || 0) + 1);
    if (!edge.directed) {
      outDegrees.set(edge.targetId, (outDegrees.get(edge.targetId) || 0) + 1);
      inDegrees.set(edge.sourceId, (inDegrees.get(edge.sourceId) || 0) + 1);
    }
  }

  let maxDegree = 0;
  const degrees = new Map<NodeId, number>();
  for (const nodeId of graph.nodes.keys()) {
    const deg = (inDegrees.get(nodeId) || 0) + (outDegrees.get(nodeId) || 0);
    degrees.set(nodeId, deg);
    if (deg > maxDegree) maxDegree = deg;
  }

  // 2. Calculate exposure (distance from INTERNET)
  const internetNodes = Array.from(graph.nodes.values()).filter(n => n.type === 'INTERNET').map(n => n.id);
  const distances = new Map<NodeId, number>();
  
  if (internetNodes.length > 0) {
    for (const inetNode of internetNodes) {
      const bfsRes = bfs(graph, inetNode);
      for (const [nodeId, parentId] of Object.entries(bfsRes.parent)) {
        if (nodeId === inetNode) {
          distances.set(nodeId, 0);
          continue;
        }
        // reconstruct distance
        let curr: string | null = nodeId;
        let dist = 0;
        while (curr !== null) {
          curr = bfsRes.parent[curr];
          if (curr !== null) dist++;
        }
        if (!distances.has(nodeId) || dist < distances.get(nodeId)!) {
          distances.set(nodeId, dist);
        }
      }
    }
  }

  for (const node of graph.nodes.values()) {
    const vuln = Math.max(0, Math.min(10, node.vulnerabilityScore));
    const crit = mapCriticality(node.criticality);
    const conn = maxDegree === 0 ? 0 : ((degrees.get(node.id) || 0) / maxDegree) * 10;
    
    let expo = 5.0; // fallback
    if (internetNodes.length > 0) {
      const dist = distances.get(node.id);
      if (dist === 0) expo = 10;
      else if (dist === 1) expo = 8;
      else if (dist === 2) expo = 6;
      else if (dist !== undefined) expo = 4;
      else expo = 2; // unreachable from internet
    }

    const rawScore = (vuln * 0.4) + (crit * 0.3) + (conn * 0.1) + (expo * 0.2);
    const score = Math.max(0, Math.min(10, Number(rawScore.toFixed(2))));

    results.set(node.id, {
      nodeId: node.id,
      score,
      level: getLevel(score),
      components: {
        vulnerability: Number(vuln.toFixed(2)),
        criticality: Number(crit.toFixed(2)),
        connectivity: Number(conn.toFixed(2)),
        exposure: Number(expo.toFixed(2)),
      }
    });
  }

  return results;
}

export function calculateEdgeRisk(graph: Graph, nodeRisks: Map<NodeId, NodeRiskResult>): Map<string, EdgeRiskResult> {
  const results = new Map<string, EdgeRiskResult>();
  
  for (const edge of graph.edges.values()) {
    const confRisk = Math.max(0, Math.min(10, edge.risk));
    const srcRisk = nodeRisks.get(edge.sourceId)?.score || 0;
    const tgtRisk = nodeRisks.get(edge.targetId)?.score || 0;
    
    // Lower cost = easier to traverse = higher risk
    const costFactor = Math.max(0, 10 - Math.min(10, Math.max(0, edge.cost)));

    const rawScore = (confRisk * 0.4) + (srcRisk * 0.25) + (tgtRisk * 0.25) + (costFactor * 0.1);
    const score = Math.max(0, Math.min(10, Number(rawScore.toFixed(2))));

    results.set(edge.id, {
      edgeId: edge.id,
      score,
      level: getLevel(score),
      components: {
        configuredRisk: Number(confRisk.toFixed(2)),
        sourceRisk: Number(srcRisk.toFixed(2)),
        targetRisk: Number(tgtRisk.toFixed(2)),
        costFactor: Number(costFactor.toFixed(2)),
      }
    });
  }
  return results;
}

export function calculatePathRisk(
  pathNodeIds: NodeId[],
  graph: Graph,
  nodeRisks: Map<NodeId, NodeRiskResult>,
  edgeRisks: Map<string, EdgeRiskResult>
): PathRiskResult {
  const nodes: NodeRiskResult[] = [];
  const edges: EdgeRiskResult[] = [];
  let highestRiskNode: string | null = null;
  let highestRiskNodeScore = -1;
  let highestRiskEdge: string | null = null;
  let highestRiskEdgeScore = -1;

  for (let i = 0; i < pathNodeIds.length; i++) {
    const nId = pathNodeIds[i];
    const nRisk = nodeRisks.get(nId);
    if (nRisk) {
      nodes.push(nRisk);
      if (nRisk.score > highestRiskNodeScore) {
        highestRiskNodeScore = nRisk.score;
        highestRiskNode = nId;
      }
    }

    if (i < pathNodeIds.length - 1) {
      const nextId = pathNodeIds[i+1];
      // Find edge between nId and nextId
      let edgeFound = false;
      const entries = graph.adjacency.get(nId) || [];
      for (const entry of entries) {
        if (entry.nodeId === nextId) {
          const eRisk = edgeRisks.get(entry.edgeId);
          if (eRisk) {
            edges.push(eRisk);
            if (eRisk.score > highestRiskEdgeScore) {
              highestRiskEdgeScore = eRisk.score;
              highestRiskEdge = entry.edgeId;
            }
          }
          edgeFound = true;
          break; // just take the first edge found in path
        }
      }
    }
  }

  const avgNodeRisk = nodes.length > 0 ? nodes.reduce((a, b) => a + b.score, 0) / nodes.length : 0;
  const avgEdgeRisk = edges.length > 0 ? edges.reduce((a, b) => a + b.score, 0) / edges.length : 0;

  const rawScore = (avgNodeRisk * 0.6) + (avgEdgeRisk * 0.4);
  const score = Math.max(0, Math.min(10, Number(rawScore.toFixed(2))));

  return {
    score,
    level: getLevel(score),
    highestRiskNode,
    highestRiskEdge,
    nodes,
    edges
  };
}

export function calculateNetworkRisk(graph: Graph, pathNodeIds?: NodeId[]): NetworkRiskResult {
  const nodeRisks = calculateNodeRisk(graph);
  const edgeRisks = calculateEdgeRisk(graph, nodeRisks);

  const nodeRiskArr = Array.from(nodeRisks.values());
  const edgeRiskArr = Array.from(edgeRisks.values());

  const avgNode = nodeRiskArr.length > 0 ? nodeRiskArr.reduce((s, n) => s + n.score, 0) / nodeRiskArr.length : 0;
  const maxNode = nodeRiskArr.length > 0 ? Math.max(...nodeRiskArr.map(n => n.score)) : 0;
  const avgEdge = edgeRiskArr.length > 0 ? edgeRiskArr.reduce((s, e) => s + e.score, 0) / edgeRiskArr.length : 0;

  const rawScore = (avgNode * 0.5) + (maxNode * 0.25) + (avgEdge * 0.25);
  const score = Math.max(0, Math.min(10, Number(rawScore.toFixed(2))));

  const sortedNodes = [...nodeRiskArr].sort((a, b) => b.score - a.score);
  const criticalRiskNodes = sortedNodes.slice(0, 3).map(n => n.nodeId);

  let path: PathRiskResult | null = null;
  if (pathNodeIds && pathNodeIds.length > 0) {
    path = calculatePathRisk(pathNodeIds, graph, nodeRisks, edgeRisks);
  }

  return {
    network: {
      score,
      level: getLevel(score),
    },
    nodes: nodeRiskArr,
    edges: edgeRiskArr,
    criticalRiskNodes,
    path
  };
}
