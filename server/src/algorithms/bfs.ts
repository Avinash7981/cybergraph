import type { Graph, BFSResult, NodeId } from './types';
import { getNeighbors, hasNode } from './graph';

/**
 * Breadth-First Search (BFS)
 *
 * Explores nodes level by level using a FIFO queue.
 * Finds shortest path in terms of hops (not cost).
 *
 * Time Complexity:  O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph   - The graph to traverse
 * @param startId - The ID of the starting node
 * @returns       - Structured BFS result with traversal order, parent map, and reachable nodes
 */
export function bfs(graph: Graph, startId: NodeId): BFSResult {
  if (!hasNode(graph, startId)) {
    throw new Error(`Start node "${startId}" does not exist in the graph.`);
  }

  const visited = new Set<NodeId>();
  const traversalOrder: NodeId[] = [];
  const parent: Record<NodeId, NodeId | null> = {};
  const queue: NodeId[] = [];

  // Initialize
  visited.add(startId);
  parent[startId] = null;
  queue.push(startId);

  while (queue.length > 0) {
    // Dequeue from front — O(1) amortized with shift (acceptable for our use case)
    const current = queue.shift()!;
    traversalOrder.push(current);

    const neighbors = getNeighbors(graph, current);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        parent[neighbor.nodeId] = current;
        queue.push(neighbor.nodeId);
      }
    }
  }

  return {
    algorithm: 'BFS',
    startNodeId: startId,
    visitedNodes: Array.from(visited),
    traversalOrder,
    parent,
    reachable: traversalOrder,
  };
}
