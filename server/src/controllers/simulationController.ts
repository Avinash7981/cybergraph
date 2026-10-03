import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { simulateAttack, SimulationParams } from '../algorithms/attackSimulation';
import { Graph, GraphNode, GraphEdge } from '../algorithms/types';

function buildGraph(nodes: any[], edges: any[]): Graph {
  const graph: Graph = {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map()
  };

  for (const node of nodes) {
    graph.nodes.set(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      criticality: node.criticality,
      vulnerabilityScore: node.vulnerabilityScore
    });
    graph.adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    graph.edges.set(edge.id, {
      id: edge.id,
      sourceId: edge.sourceNodeId,
      targetId: edge.targetNodeId,
      cost: edge.cost,
      risk: edge.risk,
      directed: edge.directed,
      status: edge.status
    });

    graph.adjacency.get(edge.sourceNodeId)?.push({ nodeId: edge.targetNodeId, edgeId: edge.id, cost: edge.cost, risk: edge.risk, directed: edge.directed });
    if (!edge.directed) {
      graph.adjacency.get(edge.targetNodeId)?.push({ nodeId: edge.sourceNodeId, edgeId: edge.id, cost: edge.cost, risk: edge.risk, directed: edge.directed });
    }
  }

  return graph;
}

export async function runSimulation(req: Request, res: Response): Promise<void> {
  try {
    const {
      networkId,
      entryNodeId,
      targetNodeId,
      maxDepth,
      blockedNodeIds,
      blockedEdgeIds
    } = req.body;

    if (!networkId || !entryNodeId || maxDepth === undefined) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (maxDepth < 0 || maxDepth > 1000) {
      res.status(400).json({ error: 'Invalid maxDepth' });
      return;
    }

    const network = await prisma.network.findUnique({
      where: { id: networkId },
      include: {
        nodes: true,
        edges: true
      }
    });

    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const graph = buildGraph(network.nodes, network.edges);
    
    // Convert arrays if not provided
    const params: SimulationParams = {
      entryNodeId,
      targetNodeId: targetNodeId || undefined,
      maxDepth,
      blockedNodeIds: blockedNodeIds || [],
      blockedEdgeIds: blockedEdgeIds || []
    };

    const result = simulateAttack(graph, params);

    // Map internal node IDs back to names for UI convenience if needed
    const nodeNames: Record<string, string> = {};
    for (const node of network.nodes) {
      nodeNames[node.id] = node.name;
    }

    res.json({ ...result, nodeNames });
  } catch (error: any) {
    console.error('Simulation error:', error);
    if (error.message.includes('not found') || error.message.includes('blocked')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Simulation failed' });
    }
  }
}
