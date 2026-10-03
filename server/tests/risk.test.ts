import { describe, it, expect } from 'vitest';
import { calculateNodeRisk, calculateEdgeRisk, calculatePathRisk, calculateNetworkRisk } from '../src/algorithms/risk';
import { Graph, GraphNode, GraphEdge, AdjacencyEntry } from '../src/algorithms/types';

describe('Risk Analysis Engine', () => {
  const createEmptyGraph = (): Graph => ({
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
  });

  const createNode = (id: string, type: string, crit: string, vuln: number): GraphNode => ({
    id, name: `Node ${id}`, type, criticality: crit, vulnerabilityScore: vuln
  });

  const createEdge = (id: string, sourceId: string, targetId: string, cost: number, risk: number): GraphEdge => ({
    id, sourceId, targetId, cost, risk, directed: true, status: 'ACTIVE'
  });

  it('1. Zero-vulnerability node produces low vulnerability component', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 0));
    
    const nodeRisks = calculateNodeRisk(graph);
    const n1 = nodeRisks.get('n1')!;
    expect(n1.components.vulnerability).toBe(0);
  });

  it('2. Maximum vulnerability produces maximum vulnerability component', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 10));
    
    const nodeRisks = calculateNodeRisk(graph);
    const n1 = nodeRisks.get('n1')!;
    expect(n1.components.vulnerability).toBe(10);
  });

  it('3. Critical node scores higher than low-criticality node with identical vulnerability', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 5));
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'CRITICAL', 5));
    
    const nodeRisks = calculateNodeRisk(graph);
    expect(nodeRisks.get('n2')!.score).toBeGreaterThan(nodeRisks.get('n1')!.score);
  });

  it('4. Connectivity normalization works', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 5));
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'LOW', 5));
    graph.nodes.set('n3', createNode('n3', 'SERVER', 'LOW', 5));
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', 1, 1));
    graph.edges.set('e2', createEdge('e2', 'n1', 'n3', 1, 1));
    
    const nodeRisks = calculateNodeRisk(graph);
    const n1 = nodeRisks.get('n1')!; // degree 2
    const n2 = nodeRisks.get('n2')!; // degree 1
    
    expect(n1.components.connectivity).toBe(10);
    expect(n2.components.connectivity).toBe(5);
  });

  it('5. Isolated node does not cause division by zero', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 5));
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'LOW', 5));
    
    const nodeRisks = calculateNodeRisk(graph);
    expect(nodeRisks.get('n1')!.components.connectivity).toBe(0);
    expect(nodeRisks.get('n2')!.components.connectivity).toBe(0);
  });

  it('6. Single-node graph works', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 5));
    const nodeRisks = calculateNodeRisk(graph);
    expect(nodeRisks.get('n1')).toBeDefined();
  });

  it('7. Empty graph works', () => {
    const graph = createEmptyGraph();
    const nodeRisks = calculateNodeRisk(graph);
    expect(nodeRisks.size).toBe(0);
  });

  it('8. Edge risk calculation works', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'CRITICAL', 10)); // High risk
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'LOW', 0)); // Low risk
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', 1, 8)); // configured risk 8, low cost (high risk traversal)
    
    const nodeRisks = calculateNodeRisk(graph);
    const edgeRisks = calculateEdgeRisk(graph, nodeRisks);
    const e1 = edgeRisks.get('e1')!;
    
    expect(e1.components.configuredRisk).toBe(8);
    expect(e1.components.sourceRisk).toBe(nodeRisks.get('n1')!.score);
    expect(e1.components.targetRisk).toBe(nodeRisks.get('n2')!.score);
    expect(e1.components.costFactor).toBe(9); // 10 - cost 1
  });

  it('9. Path risk works', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'INTERNET', 'CRITICAL', 10)); 
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'CRITICAL', 10)); 
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', 1, 10)); 
    graph.adjacency.set('n1', [{ nodeId: 'n2', edgeId: 'e1', cost: 1, risk: 10, directed: true }]);
    
    const nodeRisks = calculateNodeRisk(graph);
    const edgeRisks = calculateEdgeRisk(graph, nodeRisks);
    const pathRisk = calculatePathRisk(['n1', 'n2'], graph, nodeRisks, edgeRisks);
    
    expect(pathRisk.score).toBeGreaterThan(0);
    expect(pathRisk.nodes.length).toBe(2);
    expect(pathRisk.edges.length).toBe(1);
  });

  it('10. Highest-risk node is correctly identified', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 0)); 
    graph.nodes.set('n2', createNode('n2', 'SERVER', 'CRITICAL', 10)); 
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', 1, 5)); 
    graph.adjacency.set('n1', [{ nodeId: 'n2', edgeId: 'e1', cost: 1, risk: 5, directed: true }]);
    
    const nodeRisks = calculateNodeRisk(graph);
    const edgeRisks = calculateEdgeRisk(graph, nodeRisks);
    const pathRisk = calculatePathRisk(['n1', 'n2'], graph, nodeRisks, edgeRisks);
    
    expect(pathRisk.highestRiskNode).toBe('n2');
  });

  it('12. Network score is deterministic and 13. Same input produces exactly the same result', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', 5));
    graph.nodes.set('n2', createNode('n2', 'DATABASE', 'CRITICAL', 8));
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', 5, 5));
    
    const res1 = calculateNetworkRisk(graph);
    const res2 = calculateNetworkRisk(graph);
    expect(res1.network.score).toBe(res2.network.score);
  });

  it('14. Score never goes below 0 and 15. Score never exceeds 10', () => {
    const graph = createEmptyGraph();
    graph.nodes.set('n1', createNode('n1', 'SERVER', 'LOW', -50));
    graph.nodes.set('n2', createNode('n2', 'DATABASE', 'CRITICAL', 900));
    graph.edges.set('e1', createEdge('e1', 'n1', 'n2', -100, 500));
    
    const res = calculateNetworkRisk(graph);
    expect(res.network.score).toBeGreaterThanOrEqual(0);
    expect(res.network.score).toBeLessThanOrEqual(10);
    expect(res.nodes[0].score).toBeGreaterThanOrEqual(0);
    expect(res.nodes[0].score).toBeLessThanOrEqual(10);
    expect(res.nodes[1].score).toBeGreaterThanOrEqual(0);
    expect(res.nodes[1].score).toBeLessThanOrEqual(10);
  });
});
