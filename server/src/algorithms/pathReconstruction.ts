import type { PathReconstructionResult, NodeId } from './types';

/**
 * Reconstruct the path from source to target using the `previous` map
 * produced by BFS or Dijkstra.
 *
 * Time: O(V) — at most V steps to walk back the chain.
 */
export function reconstructPath(
  previous: Record<NodeId, NodeId | null>,
  sourceId: NodeId,
  targetId: NodeId,
  distances: Record<NodeId, number>
): PathReconstructionResult {
  // If target was never reached, its distance will be Infinity
  if (distances[targetId] === undefined || distances[targetId] === Infinity) {
    return { reachable: false, path: [], distance: Infinity };
  }

  const path: NodeId[] = [];
  let current: NodeId | null = targetId;

  // Walk back from target to source
  while (current !== null) {
    path.unshift(current);

    if (current === sourceId) break;

    const prev: NodeId | null | undefined = previous[current];
    if (prev === undefined) {
      // broken chain — target is not actually reachable
      return { reachable: false, path: [], distance: Infinity };
    }
    current = prev;
  }

  // Sanity check: path must start at source
  if (path[0] !== sourceId) {
    return { reachable: false, path: [], distance: Infinity };
  }

  return {
    reachable: true,
    path,
    distance: distances[targetId],
  };
}
