import type { Request, Response } from 'express';
import prisma from '../services/prisma';
import { NodeType, Criticality, EdgeStatus } from '@prisma/client';

const VALID_NODE_TYPES = Object.values(NodeType);
const VALID_CRITICALITIES = Object.values(Criticality);
const VALID_EDGE_STATUSES = Object.values(EdgeStatus);

// GET /api/networks
export async function listNetworks(req: Request, res: Response): Promise<void> {
  try {
    const ownerId = (req as any).user?.id;
    const networks = await prisma.network.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { nodes: true, edges: true } },
      },
    });
    res.json(networks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch networks' });
  }
}

// POST /api/networks
export async function createNetwork(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Network name is required' });
      return;
    }
    const ownerId = (req as any).user?.id;
    const network = await prisma.network.create({
      data: { name: name.trim(), description: description?.trim() ?? null, ownerId },
    });
    res.status(201).json(network);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create network' });
  }
}

// GET /api/networks/:id
export async function getNetwork(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const network = await prisma.network.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        edges: {
          include: { sourceNode: true, targetNode: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch network' });
  }
}

// PUT /api/networks/:id
export async function updateNetwork(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Network name is required' });
      return;
    }
    const network = await prisma.network.update({
      where: { id },
      data: { name: name.trim(), description: description?.trim() ?? null },
    });
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update network' });
  }
}

// DELETE /api/networks/:id
export async function deleteNetwork(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await prisma.network.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete network' });
  }
}

// POST /api/networks/import
export async function importNetwork(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    
    // 1. Validate Network
    if (!data.network || typeof data.network !== 'object') {
      res.status(400).json({ error: 'Missing or invalid network object' });
      return;
    }
    const { name, description } = data.network;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Network name is required' });
      return;
    }
    
    // 2. Validate Nodes
    if (!Array.isArray(data.nodes)) {
      res.status(400).json({ error: 'Nodes must be an array' });
      return;
    }
    const nodeIds = new Set<string>();
    for (const node of data.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        res.status(400).json({ error: 'Node identifier is required' });
        return;
      }
      if (nodeIds.has(node.id)) {
        res.status(400).json({ error: `Duplicate node identifier: '${node.id}'` });
        return;
      }
      nodeIds.add(node.id);
      
      if (!node.name || typeof node.name !== 'string' || node.name.trim() === '') {
        res.status(400).json({ error: `Node '${node.id}' label is invalid` });
        return;
      }
      if (!VALID_NODE_TYPES.includes(node.type)) {
        res.status(400).json({ error: `Node '${node.name}' has invalid type` });
        return;
      }
      if (!VALID_CRITICALITIES.includes(node.criticality)) {
        res.status(400).json({ error: `Node '${node.name}' has invalid criticality` });
        return;
      }
      const vscore = Number(node.vulnerabilityScore);
      if (isNaN(vscore) || vscore < 0 || vscore > 10) {
        res.status(400).json({ error: `Node '${node.name}' has an invalid vulnerability score` });
        return;
      }
      
      if (node.positionX !== undefined && node.positionX !== null) {
        const px = Number(node.positionX);
        if (!Number.isFinite(px)) {
          res.status(400).json({ error: `Node '${node.name}' has an invalid positionX` });
          return;
        }
      }
      if (node.positionY !== undefined && node.positionY !== null) {
        const py = Number(node.positionY);
        if (!Number.isFinite(py)) {
          res.status(400).json({ error: `Node '${node.name}' has an invalid positionY` });
          return;
        }
      }
    }
    
    // 3. Validate Edges
    if (!Array.isArray(data.edges)) {
      res.status(400).json({ error: 'Edges must be an array' });
      return;
    }
    for (const edge of data.edges) {
      if (!edge.sourceNodeId || !nodeIds.has(edge.sourceNodeId)) {
        res.status(400).json({ error: `Edge references unknown source node '${edge.sourceNodeId}'` });
        return;
      }
      if (!edge.targetNodeId || !nodeIds.has(edge.targetNodeId)) {
        res.status(400).json({ error: `Edge references unknown target node '${edge.targetNodeId}'` });
        return;
      }
      if (edge.sourceNodeId === edge.targetNodeId) {
        res.status(400).json({ error: 'Self-loops are not allowed' });
        return;
      }
      const cost = Number(edge.cost);
      if (isNaN(cost) || !Number.isFinite(cost) || cost <= 0) {
        res.status(400).json({ error: 'Edge cost must be greater than 0' });
        return;
      }
      const risk = Number(edge.risk);
      if (isNaN(risk) || !Number.isFinite(risk) || risk < 0 || risk > 10) {
        res.status(400).json({ error: 'Edge risk must be between 0 and 10' });
        return;
      }
      if (typeof edge.directed !== 'boolean') {
        res.status(400).json({ error: 'Edge direction is invalid' });
        return;
      }
      if (edge.status && !VALID_EDGE_STATUSES.includes(edge.status)) {
        res.status(400).json({ error: 'Edge status is invalid' });
        return;
      }
    }
    
    const ownerId = (req as any).user?.id;

    // 4. Database Transaction
    const importedNetwork = await prisma.$transaction(async (tx) => {
      const net = await tx.network.create({
        data: {
          name: name.trim(),
          description: description?.trim() ?? null,
          ownerId,
        }
      });
      
      const nodeIdMap = new Map<string, string>();
      
      for (const node of data.nodes) {
        const createdNode = await tx.node.create({
          data: {
            networkId: net.id,
            name: node.name.trim(),
            type: node.type,
            criticality: node.criticality,
            vulnerabilityScore: Number(node.vulnerabilityScore),
            positionX: (node.positionX !== undefined && node.positionX !== null) ? Number(node.positionX) : null,
            positionY: (node.positionY !== undefined && node.positionY !== null) ? Number(node.positionY) : null,
          }
        });
        nodeIdMap.set(node.id, createdNode.id);
      }
      
      for (const edge of data.edges) {
        await tx.edge.create({
          data: {
            networkId: net.id,
            sourceNodeId: nodeIdMap.get(edge.sourceNodeId)!,
            targetNodeId: nodeIdMap.get(edge.targetNodeId)!,
            cost: Number(edge.cost),
            risk: Number(edge.risk),
            directed: edge.directed,
            status: edge.status || EdgeStatus.ACTIVE,
          }
        });
      }
      
      return net;
    });
    
    res.status(201).json({ message: 'Network imported successfully', network: importedNetwork });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
    res.status(400).json({ error: msg });
  }
}
