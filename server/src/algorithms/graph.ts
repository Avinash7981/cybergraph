import type { Graph, GraphNode, GraphEdge, AdjacencyEntry, NodeId } from './types';

/**
 * Build a reusable Graph abstraction from raw node/edge data.
 * Supports both directed and undirected edges.
 * Only ACTIVE edges are included in the adjacency list by default.
 */
export function buildGraph(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[],
  onlyActive: boolean = true
): Graph {
  const nodes = new Map<NodeId, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const adjacency = new Map<NodeId, AdjacencyEntry[]>();

  // Index nodes
  for (const node of rawNodes) {
    nodes.set(node.id, node);
    adjacency.set(node.id, []);
  }

  // Index edges and build adjacency list
  for (const edge of rawEdges) {
    if (onlyActive && edge.status === 'ISOLATED') continue;

    edges.set(edge.id, edge);

    // Validate cost is positive (Dijkstra requires non-negative)
    if (edge.cost < 0) {
      throw new Error(`Edge ${edge.id} has a negative cost (${edge.cost}). Negative weights are not supported.`);
    }

    const srcList = adjacency.get(edge.sourceId);
    if (srcList) {
      srcList.push({
        nodeId: edge.targetId,
        edgeId: edge.id,
        cost: edge.cost,
        risk: edge.risk,
        directed: edge.directed,
      });
    }

    // Undirected edges go both ways
    if (!edge.directed) {
      const tgtList = adjacency.get(edge.targetId);
      if (tgtList) {
        tgtList.push({
          nodeId: edge.sourceId,
          edgeId: edge.id,
          cost: edge.cost,
          risk: edge.risk,
          directed: edge.directed,
        });
      }
    }
  }

  return { nodes, edges, adjacency };
}

/**
 * Get all neighbors of a node in the graph.
 */
export function getNeighbors(graph: Graph, nodeId: NodeId): AdjacencyEntry[] {
  return graph.adjacency.get(nodeId) ?? [];
}

/**
 * Check if a node exists in the graph.
 */
export function hasNode(graph: Graph, nodeId: NodeId): boolean {
  return graph.nodes.has(nodeId);
}
