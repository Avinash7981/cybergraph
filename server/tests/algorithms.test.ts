import { describe, it, expect } from 'vitest';
import { buildGraph } from '../src/algorithms/graph';
import { bfs } from '../src/algorithms/bfs';
import { dfs } from '../src/algorithms/dfs';
import { dijkstra } from '../src/algorithms/dijkstra';
import { reconstructPath } from '../src/algorithms/pathReconstruction';
import type { GraphNode, GraphEdge } from '../src/algorithms/types';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeNode(id: string, name?: string): GraphNode {
  return {
    id,
    name: name ?? id,
    type: 'SERVER',
    criticality: 'LOW',
    vulnerabilityScore: 5,
  };
}

function makeEdge(
  id: string,
  sourceId: string,
  targetId: string,
  cost: number = 1,
  directed: boolean = false
): GraphEdge {
  return {
    id,
    sourceId,
    targetId,
    cost,
    risk: 0,
    directed,
    status: 'ACTIVE',
  };
}

// ─── BFS Tests ────────────────────────────────────────────────────────────────

describe('BFS', () => {
  it('throws on empty graph (node not found)', () => {
    const graph = buildGraph([], []);
    expect(() => bfs(graph, 'A')).toThrow();
  });

  it('handles single node', () => {
    const graph = buildGraph([makeNode('A')], []);
    const result = bfs(graph, 'A');
    expect(result.algorithm).toBe('BFS');
    expect(result.visitedNodes).toEqual(['A']);
    expect(result.traversalOrder).toEqual(['A']);
    expect(result.parent['A']).toBeNull();
  });

  it('traverses connected undirected graph in BFS order', () => {
    // A - B - C
    //     |
    //     D
    const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'B', 'D'),
    ];
    const graph = buildGraph(nodes, edges);
    const result = bfs(graph, 'A');

    expect(result.visitedNodes).toContain('A');
    expect(result.visitedNodes).toContain('B');
    expect(result.visitedNodes).toContain('C');
    expect(result.visitedNodes).toContain('D');
    expect(result.traversalOrder[0]).toBe('A');
    expect(result.traversalOrder[1]).toBe('B'); // B is directly connected to A
    expect(result.parent['B']).toBe('A');
  });

  it('handles disconnected graph — only reachable nodes visited', () => {
    const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B'),
      // C and D are isolated
    ];
    const graph = buildGraph(nodes, edges);
    const result = bfs(graph, 'A');

    expect(result.visitedNodes).toContain('A');
    expect(result.visitedNodes).toContain('B');
    expect(result.visitedNodes).not.toContain('C');
    expect(result.visitedNodes).not.toContain('D');
  });

  it('handles cycles without infinite loop', () => {
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'C', 'A'), // cycle
    ];
    const graph = buildGraph(nodes, edges);
    const result = bfs(graph, 'A');

    expect(result.visitedNodes.length).toBe(3);
    // Each node visited exactly once
    expect(new Set(result.visitedNodes).size).toBe(3);
  });
});

// ─── DFS Tests ────────────────────────────────────────────────────────────────

describe('DFS', () => {
  it('throws on empty graph (node not found)', () => {
    const graph = buildGraph([], []);
    expect(() => dfs(graph, 'A')).toThrow();
  });

  it('traverses connected graph', () => {
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'B', 'C')];
    const graph = buildGraph(nodes, edges);
    const result = dfs(graph, 'A');

    expect(result.algorithm).toBe('DFS');
    expect(result.visitedNodes).toContain('A');
    expect(result.visitedNodes).toContain('B');
    expect(result.visitedNodes).toContain('C');
    expect(result.traversalOrder[0]).toBe('A');
  });

  it('handles disconnected graph', () => {
    const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
    const edges = [makeEdge('e1', 'A', 'B')];
    const graph = buildGraph(nodes, edges);
    const result = dfs(graph, 'A');

    expect(result.visitedNodes).toContain('A');
    expect(result.visitedNodes).toContain('B');
    expect(result.visitedNodes).not.toContain('C');
    expect(result.visitedNodes).not.toContain('D');
  });

  it('handles cycles without infinite loop', () => {
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'C', 'A'),
    ];
    const graph = buildGraph(nodes, edges);
    const result = dfs(graph, 'A');

    expect(result.visitedNodes.length).toBe(3);
    expect(new Set(result.visitedNodes).size).toBe(3);
  });
});

// ─── Dijkstra Tests ───────────────────────────────────────────────────────────

describe('Dijkstra', () => {
  it('finds shortest path in simple weighted graph', () => {
    // A -1-> B -2-> C
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B', 1, true),
      makeEdge('e2', 'B', 'C', 2, true),
    ];
    const graph = buildGraph(nodes, edges);
    const result = dijkstra(graph, 'A', 'C');

    expect(result.algorithm).toBe('DIJKSTRA');
    expect(result.reachable).toBe(true);
    expect(result.totalCost).toBe(3);
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('chooses lower cost among multiple paths', () => {
    // A -10-> C
    // A -1->  B -1-> C
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'C', 10, true),
      makeEdge('e2', 'A', 'B', 1, true),
      makeEdge('e3', 'B', 'C', 1, true),
    ];
    const graph = buildGraph(nodes, edges);
    const result = dijkstra(graph, 'A', 'C');

    expect(result.reachable).toBe(true);
    expect(result.totalCost).toBe(2);
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('returns unreachable when no path exists', () => {
    const nodes = ['A', 'B', 'C'].map((id) => makeNode(id));
    const edges = [makeEdge('e1', 'A', 'B', 1, true)]; // C is disconnected
    const graph = buildGraph(nodes, edges);
    const result = dijkstra(graph, 'A', 'C');

    expect(result.reachable).toBe(false);
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBe(Infinity);
  });

  it('throws for negative edge cost', () => {
    const nodes = ['A', 'B'].map((id) => makeNode(id));
    const edges = [{ ...makeEdge('e1', 'A', 'B', -1, true) }];
    expect(() => buildGraph(nodes, edges)).toThrow(/negative cost/i);
  });

  it('handles equal-cost paths and returns one valid shortest', () => {
    // A -1-> B -1-> D
    // A -1-> C -1-> D
    const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
    const edges = [
      makeEdge('e1', 'A', 'B', 1, true),
      makeEdge('e2', 'A', 'C', 1, true),
      makeEdge('e3', 'B', 'D', 1, true),
      makeEdge('e4', 'C', 'D', 1, true),
    ];
    const graph = buildGraph(nodes, edges);
    const result = dijkstra(graph, 'A', 'D');

    expect(result.reachable).toBe(true);
    expect(result.totalCost).toBe(2);
    expect(result.path[0]).toBe('A');
    expect(result.path[result.path.length - 1]).toBe('D');
  });

  it('source equals target returns zero-cost single-node path', () => {
    const nodes = ['A', 'B'].map((id) => makeNode(id));
    const edges = [makeEdge('e1', 'A', 'B', 1, true)];
    const graph = buildGraph(nodes, edges);
    const result = dijkstra(graph, 'A', 'A');

    expect(result.reachable).toBe(true);
    expect(result.totalCost).toBe(0);
    expect(result.path).toEqual(['A']);
  });
});

// ─── Path Reconstruction Tests ────────────────────────────────────────────────

describe('reconstructPath', () => {
  it('reconstructs valid path', () => {
    const previous: Record<string, string | null> = { A: null, B: 'A', C: 'B' };
    const distances: Record<string, number> = { A: 0, B: 1, C: 3 };
    const result = reconstructPath(previous, 'A', 'C', distances);

    expect(result.reachable).toBe(true);
    expect(result.path).toEqual(['A', 'B', 'C']);
    expect(result.distance).toBe(3);
  });

  it('returns unreachable when target distance is Infinity', () => {
    const previous: Record<string, string | null> = { A: null, B: 'A', C: null };
    const distances: Record<string, number> = { A: 0, B: 1, C: Infinity };
    const result = reconstructPath(previous, 'A', 'C', distances);

    expect(result.reachable).toBe(false);
    expect(result.path).toEqual([]);
    expect(result.distance).toBe(Infinity);
  });
});
