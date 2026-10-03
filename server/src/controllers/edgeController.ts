import type { Request, Response } from 'express';
import prisma from '../services/prisma';
import { EdgeStatus } from '@prisma/client';

const VALID_STATUSES = Object.values(EdgeStatus);

// GET /api/networks/:networkId/edges
export async function listEdges(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const edges = await prisma.edge.findMany({
      where: { networkId },
      include: { sourceNode: true, targetNode: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(edges);
  } catch {
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
}

// POST /api/networks/:networkId/edges
export async function createEdge(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const { sourceNodeId, targetNodeId, cost, risk, directed, status } = req.body;

    if (!sourceNodeId || typeof sourceNodeId !== 'string') {
      res.status(400).json({ error: 'Source node ID is required' });
      return;
    }
    if (!targetNodeId || typeof targetNodeId !== 'string') {
      res.status(400).json({ error: 'Target node ID is required' });
      return;
    }
    if (sourceNodeId === targetNodeId) {
      res.status(400).json({ error: 'Source and target nodes cannot be the same' });
      return;
    }

    const costNum = Number(cost);
    if (isNaN(costNum) || costNum <= 0) {
      res.status(400).json({ error: 'Cost must be a positive number' });
      return;
    }

    const riskNum = Number(risk);
    if (isNaN(riskNum) || riskNum < 0 || riskNum > 10) {
      res.status(400).json({ error: 'Risk must be a number between 0 and 10' });
      return;
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const [srcNode, tgtNode] = await Promise.all([
      prisma.node.findUnique({ where: { id: sourceNodeId, networkId } }),
      prisma.node.findUnique({ where: { id: targetNodeId, networkId } }),
    ]);
    if (!srcNode) {
      res.status(400).json({ error: 'Source node not found in this network' });
      return;
    }
    if (!tgtNode) {
      res.status(400).json({ error: 'Target node not found in this network' });
      return;
    }

    const edge = await prisma.edge.create({
      data: {
        networkId,
        sourceNodeId,
        targetNodeId,
        cost: costNum,
        risk: riskNum,
        directed: directed === true || directed === 'true',
        status: (status ?? 'ACTIVE') as EdgeStatus,
      },
      include: { sourceNode: true, targetNode: true },
    });
    res.status(201).json(edge);
  } catch {
    res.status(500).json({ error: 'Failed to create edge' });
  }
}

// PUT /api/networks/:networkId/edges/:edgeId
export async function updateEdge(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const edgeId = req.params.edgeId as string;
    const { cost, risk, directed, status } = req.body;

    const updateData: Record<string, unknown> = {};

    if (cost !== undefined) {
      const costNum = Number(cost);
      if (isNaN(costNum) || costNum <= 0) {
        res.status(400).json({ error: 'Cost must be a positive number' });
        return;
      }
      updateData.cost = costNum;
    }

    if (risk !== undefined) {
      const riskNum = Number(risk);
      if (isNaN(riskNum) || riskNum < 0 || riskNum > 10) {
        res.status(400).json({ error: 'Risk must be between 0 and 10' });
        return;
      }
      updateData.risk = riskNum;
    }

    if (directed !== undefined) {
      updateData.directed = directed === true || directed === 'true';
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
        return;
      }
      updateData.status = status;
    }

    const edge = await prisma.edge.update({
      where: { id: edgeId, networkId },
      data: updateData,
      include: { sourceNode: true, targetNode: true },
    });
    res.json(edge);
  } catch {
    res.status(500).json({ error: 'Failed to update edge' });
  }
}

// DELETE /api/networks/:networkId/edges/:edgeId
export async function deleteEdge(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const edgeId = req.params.edgeId as string;
    await prisma.edge.delete({ where: { id: edgeId, networkId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete edge' });
  }
}
