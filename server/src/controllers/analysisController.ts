import type { Request, Response } from 'express';
import prisma from '../services/prisma';
import { buildGraph } from '../algorithms/graph';
import { bfs } from '../algorithms/bfs';
import { dfs } from '../algorithms/dfs';
import { dijkstra } from '../algorithms/dijkstra';
import { calculateNetworkRisk } from '../algorithms/risk';
import { generatePdfReport } from '../services/pdfGenerator';
import type { GraphNode, GraphEdge } from '../algorithms/types';

async function loadGraph(networkId: string) {
  const network = await prisma.network.findUnique({
    where: { id: networkId },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!network) return null;

  const graphNodes: GraphNode[] = network.nodes.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
    criticality: n.criticality,
    vulnerabilityScore: n.vulnerabilityScore,
    positionX: n.positionX,
    positionY: n.positionY,
  }));

  const graphEdges: GraphEdge[] = network.edges.map((e) => ({
    id: e.id,
    sourceId: e.sourceNodeId,
    targetId: e.targetNodeId,
    cost: e.cost,
    risk: e.risk,
    directed: e.directed,
    status: e.status as 'ACTIVE' | 'ISOLATED',
  }));

  return buildGraph(graphNodes, graphEdges, true);
}

// POST /api/analysis/bfs
export async function runBFS(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, sourceNodeId } = req.body;

    if (!networkId || !sourceNodeId) {
      res.status(400).json({ error: 'networkId and sourceNodeId are required' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const startTime = performance.now();
    const result = bfs(graph, sourceNodeId);
    const runtimeMs = performance.now() - startTime;

    // Enrich with node names
    const nodeNames: Record<string, string> = {};
    for (const [id, node] of graph.nodes) {
      nodeNames[id] = node.name;
    }

    res.json({
      ...result,
      runtimeMs: parseFloat(runtimeMs.toFixed(4)),
      theoreticalComplexity: { time: 'O(V + E)', space: 'O(V)' },
      nodeNames,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'BFS failed';
    res.status(400).json({ error: message });
  }
}

// POST /api/analysis/dfs
export async function runDFS(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, sourceNodeId } = req.body;

    if (!networkId || !sourceNodeId) {
      res.status(400).json({ error: 'networkId and sourceNodeId are required' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const startTime = performance.now();
    const result = dfs(graph, sourceNodeId);
    const runtimeMs = performance.now() - startTime;

    const nodeNames: Record<string, string> = {};
    for (const [id, node] of graph.nodes) {
      nodeNames[id] = node.name;
    }

    res.json({
      ...result,
      runtimeMs: parseFloat(runtimeMs.toFixed(4)),
      theoreticalComplexity: { time: 'O(V + E)', space: 'O(V)' },
      nodeNames,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DFS failed';
    res.status(400).json({ error: message });
  }
}

// POST /api/analysis/dijkstra
export async function runDijkstra(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, sourceNodeId, targetNodeId } = req.body;

    if (!networkId || !sourceNodeId || !targetNodeId) {
      res.status(400).json({ error: 'networkId, sourceNodeId, and targetNodeId are required' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const startTime = performance.now();
    const result = dijkstra(graph, sourceNodeId, targetNodeId);
    const runtimeMs = performance.now() - startTime;

    const nodeNames: Record<string, string> = {};
    for (const [id, node] of graph.nodes) {
      nodeNames[id] = node.name;
    }

    res.json({
      ...result,
      totalCost: result.reachable ? result.totalCost : null,
      runtimeMs: parseFloat(runtimeMs.toFixed(4)),
      theoreticalComplexity: { time: 'O((V + E) log V)', space: 'O(V)' },
      nodeNames,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dijkstra failed';
    res.status(400).json({ error: message });
  }
}

// POST /api/analysis/compare — run all three and return side by side
export async function runComparison(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, sourceNodeId, targetNodeId } = req.body;

    if (!networkId || !sourceNodeId || !targetNodeId) {
      res.status(400).json({ error: 'networkId, sourceNodeId, and targetNodeId are required' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const nodeNames: Record<string, string> = {};
    for (const [id, node] of graph.nodes) {
      nodeNames[id] = node.name;
    }

    // BFS
    const bfsStart = performance.now();
    const bfsResult = bfs(graph, sourceNodeId);
    const bfsRuntime = performance.now() - bfsStart;

    // DFS
    const dfsStart = performance.now();
    const dfsResult = dfs(graph, sourceNodeId);
    const dfsRuntime = performance.now() - dfsStart;

    // Dijkstra
    const dijkStart = performance.now();
    const dijkResult = dijkstra(graph, sourceNodeId, targetNodeId);
    const dijkRuntime = performance.now() - dijkStart;

    res.json({
      nodeNames,
      bfs: {
        ...bfsResult,
        runtimeMs: parseFloat(bfsRuntime.toFixed(4)),
        theoreticalComplexity: { time: 'O(V + E)', space: 'O(V)' },
      },
      dfs: {
        ...dfsResult,
        runtimeMs: parseFloat(dfsRuntime.toFixed(4)),
        theoreticalComplexity: { time: 'O(V + E)', space: 'O(V)' },
      },
      dijkstra: {
        ...dijkResult,
        totalCost: dijkResult.reachable ? dijkResult.totalCost : null,
        runtimeMs: parseFloat(dijkRuntime.toFixed(4)),
        theoreticalComplexity: { time: 'O((V + E) log V)', space: 'O(V)' },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Comparison failed';
    res.status(400).json({ error: message });
  }
}

// POST /api/analysis/risk
export async function runRiskAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, path } = req.body;
    
    if (!networkId) {
      res.status(400).json({ error: 'networkId is required' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    // Enrich nodeNames for the frontend
    const nodeNames: Record<string, string> = {};
    for (const [id, node] of graph.nodes) {
      nodeNames[id] = node.name;
    }

    const riskResult = calculateNetworkRisk(graph, Array.isArray(path) ? path : undefined);

    res.json({
      ...riskResult,
      nodeNames
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Risk analysis failed';
    res.status(400).json({ error: message });
  }
}

// POST /api/analysis/report
export async function generateReport(req: Request, res: Response): Promise<void> {
  try {
    const { networkId, sourceNodeId, targetNodeId, algorithm } = req.body;
    
    if (!networkId) {
      res.status(400).json({ error: 'networkId is required' });
      return;
    }

    const network = await prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const graph = await loadGraph(networkId);
    if (!graph) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    let dijkstraRes;
    let pathIds: string[] | undefined;

    if (algorithm === 'DIJKSTRA' && sourceNodeId && targetNodeId) {
      dijkstraRes = dijkstra(graph, sourceNodeId, targetNodeId);
      if (dijkstraRes.reachable && dijkstraRes.path.length > 0) {
        pathIds = dijkstraRes.path;
      }
    }

    const riskResult = calculateNetworkRisk(graph, pathIds);

    const pdfBuffer = await generatePdfReport({
      networkId: network.id,
      networkName: network.name,
      description: network.description || '',
      createdAt: network.createdAt,
      graph,
      riskResult,
      dijkstraRes,
    });

    // Clean up filename
    const safeName = network.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cybergraph-${safeName}-analysis.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}

// GET /api/networks/:id/export
export async function exportNetwork(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const network = await prisma.network.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    const { nodes, edges, ...networkMeta } = network;
    res.json({ network: networkMeta, nodes, edges });
  } catch {
    res.status(500).json({ error: 'Failed to export network' });
  }
}
