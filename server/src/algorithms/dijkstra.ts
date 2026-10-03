import type { Graph, DijkstraResult, NodeId } from './types';
import { getNeighbors, hasNode } from './graph';
import { reconstructPath } from './pathReconstruction';

/**
 * Binary Min-Heap for Dijkstra's priority queue.
 * Stores [cost, nodeId] tuples.
 * Time: O(log n) insert and extract-min.
 */
class MinHeap {
  private heap: Array<[number, NodeId]> = [];

  get size(): number {
    return this.heap.length;
  }

  insert(cost: number, nodeId: NodeId): void {
    this.heap.push([cost, nodeId]);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): [number, NodeId] | null {
    if (this.heap.length === 0) return null;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    return min;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent][0] <= this.heap[index][0]) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.heap[left][0] < this.heap[smallest][0]) {
        smallest = left;
      }
      if (right < length && this.heap[right][0] < this.heap[smallest][0]) {
        smallest = right;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

/**
 * Dijkstra's Shortest Path Algorithm
 *
 * Finds the minimum-cost path between source and target using a binary min-heap.
 * Requires all edge costs to be non-negative.
 *
 * Time Complexity:  O((V + E) log V)
 * Space Complexity: O(V)
 *
 * @param graph    - The graph to search
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @returns        - Structured Dijkstra result
 */
export function dijkstra(graph: Graph, sourceId: NodeId, targetId: NodeId): DijkstraResult {
  if (!hasNode(graph, sourceId)) {
    throw new Error(`Source node "${sourceId}" does not exist in the graph.`);
  }
  if (!hasNode(graph, targetId)) {
    throw new Error(`Target node "${targetId}" does not exist in the graph.`);
  }

  // Validate that all edge costs are non-negative before running
  for (const [, edge] of graph.edges) {
    if (edge.cost < 0) {
      throw new Error(`Edge "${edge.id}" has negative cost (${edge.cost}). Dijkstra requires non-negative weights.`);
    }
  }

  const distances: Record<NodeId, number> = {};
  const previous: Record<NodeId, NodeId | null> = {};
  const processedNodes = new Set<NodeId>();
  const visitedNodes: NodeId[] = [];

  // Initialize all distances to Infinity
  for (const [nodeId] of graph.nodes) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  }
  distances[sourceId] = 0;

  const pq = new MinHeap();
  pq.insert(0, sourceId);

  while (pq.size > 0) {
    const entry = pq.extractMin()!;
    const [currentDist, currentId] = entry;

    // Skip stale entries (lazy deletion)
    if (processedNodes.has(currentId)) continue;
    processedNodes.add(currentId);
    visitedNodes.push(currentId);

    // Early exit if we've reached the target
    if (currentId === targetId) break;

    // If the extracted distance is greater than known distance, skip
    if (currentDist > distances[currentId]) continue;

    const neighbors = getNeighbors(graph, currentId);
    for (const neighbor of neighbors) {
      if (processedNodes.has(neighbor.nodeId)) continue;

      const newDist = distances[currentId] + neighbor.cost;

      if (newDist < distances[neighbor.nodeId]) {
        distances[neighbor.nodeId] = newDist;
        previous[neighbor.nodeId] = currentId;
        pq.insert(newDist, neighbor.nodeId);
      }
    }
  }

  // Reconstruct path
  const pathResult = reconstructPath(previous, sourceId, targetId, distances);

  return {
    algorithm: 'DIJKSTRA',
    sourceNodeId: sourceId,
    targetNodeId: targetId,
    reachable: pathResult.reachable,
    path: pathResult.path,
    totalCost: pathResult.reachable ? pathResult.distance : Infinity,
    visitedNodes,
    distances,
    previous,
  };
}
