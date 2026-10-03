import type { Graph, DFSResult, NodeId } from './types';
import { getNeighbors, hasNode } from './graph';

/**
 * Depth-First Search (DFS)
 *
 * Explores nodes as deep as possible before backtracking.
 * Uses an explicit stack (iterative) to avoid call-stack overflow on large graphs.
 *
 * Time Complexity:  O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph   - The graph to traverse
 * @param startId - The ID of the starting node
 * @returns       - Structured DFS result with traversal order, parent map, and reachable nodes
 */
export function dfs(graph: Graph, startId: NodeId): DFSResult {
  if (!hasNode(graph, startId)) {
    throw new Error(`Start node "${startId}" does not exist in the graph.`);
  }

  const visited = new Set<NodeId>();
  const traversalOrder: NodeId[] = [];
  const parent: Record<NodeId, NodeId | null> = {};
  // Explicit stack: [nodeId, parentId]
  const stack: Array<[NodeId, NodeId | null]> = [[startId, null]];

  while (stack.length > 0) {
    const [current, parentNode] = stack.pop()!;

    if (visited.has(current)) continue;

    visited.add(current);
    traversalOrder.push(current);
    parent[current] = parentNode;

    // Push neighbors in reverse order so that the "first" neighbor
    // is explored first (maintaining consistent ordering with recursive DFS)
    const neighbors = getNeighbors(graph, current);
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      if (!visited.has(neighbor.nodeId)) {
        stack.push([neighbor.nodeId, current]);
      }
    }
  }

  return {
    algorithm: 'DFS',
    startNodeId: startId,
    visitedNodes: Array.from(visited),
    traversalOrder,
    parent,
    reachable: traversalOrder,
  };
}
