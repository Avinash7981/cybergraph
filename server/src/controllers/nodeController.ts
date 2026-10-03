import type { Request, Response } from 'express';
import prisma from '../services/prisma';
import { NodeType, Criticality } from '@prisma/client';

const VALID_NODE_TYPES = Object.values(NodeType);
const VALID_CRITICALITIES = Object.values(Criticality);

// GET /api/networks/:networkId/nodes
export async function listNodes(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const nodes = await prisma.node.findMany({
      where: { networkId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(nodes);
  } catch {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
}

// POST /api/networks/:networkId/nodes
export async function createNode(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const { name, type, criticality, vulnerabilityScore, positionX, positionY } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Node name is required' });
      return;
    }
    if (!type || !VALID_NODE_TYPES.includes(type)) {
      res.status(400).json({ error: `Node type must be one of: ${VALID_NODE_TYPES.join(', ')}` });
      return;
    }
    if (!criticality || !VALID_CRITICALITIES.includes(criticality)) {
      res.status(400).json({ error: `Criticality must be one of: ${VALID_CRITICALITIES.join(', ')}` });
      return;
    }
    const vscore = Number(vulnerabilityScore);
    if (isNaN(vscore) || vscore < 0 || vscore > 10) {
      res.status(400).json({ error: 'Vulnerability score must be a number between 0 and 10' });
      return;
    }

    const network = await prisma.network.findUnique({ where: { id: networkId } });
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    const node = await prisma.node.create({
      data: {
        networkId,
        name: name.trim(),
        type: type as NodeType,
        criticality: criticality as Criticality,
        vulnerabilityScore: vscore,
        positionX: positionX !== undefined ? Number(positionX) : null,
        positionY: positionY !== undefined ? Number(positionY) : null,
      },
    });
    res.status(201).json(node);
  } catch {
    res.status(500).json({ error: 'Failed to create node' });
  }
}

// PUT /api/networks/:networkId/nodes/:nodeId
export async function updateNode(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const nodeId = req.params.nodeId as string;
    const { name, type, criticality, vulnerabilityScore, positionX, positionY } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ error: 'Node name cannot be empty' });
      return;
    }
    if (type !== undefined && !VALID_NODE_TYPES.includes(type)) {
      res.status(400).json({ error: `Node type must be one of: ${VALID_NODE_TYPES.join(', ')}` });
      return;
    }
    if (criticality !== undefined && !VALID_CRITICALITIES.includes(criticality)) {
      res.status(400).json({ error: `Criticality must be one of: ${VALID_CRITICALITIES.join(', ')}` });
      return;
    }
    if (vulnerabilityScore !== undefined) {
      const vscore = Number(vulnerabilityScore);
      if (isNaN(vscore) || vscore < 0 || vscore > 10) {
        res.status(400).json({ error: 'Vulnerability score must be between 0 and 10' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (criticality !== undefined) updateData.criticality = criticality;
    if (vulnerabilityScore !== undefined) updateData.vulnerabilityScore = Number(vulnerabilityScore);
    
    if (positionX !== undefined) {
      const posX = Number(positionX);
      if (!Number.isFinite(posX)) {
        res.status(400).json({ error: 'positionX must be a finite number' });
        return;
      }
      updateData.positionX = posX;
    }
    
    if (positionY !== undefined) {
      const posY = Number(positionY);
      if (!Number.isFinite(posY)) {
        res.status(400).json({ error: 'positionY must be a finite number' });
        return;
      }
      updateData.positionY = posY;
    }

    const node = await prisma.node.update({
      where: { id: nodeId, networkId },
      data: updateData,
    });
    res.json(node);
  } catch {
    res.status(500).json({ error: 'Failed to update node' });
  }
}

// DELETE /api/networks/:networkId/nodes/:nodeId
export async function deleteNode(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const nodeId = req.params.nodeId as string;
    await prisma.node.delete({ where: { id: nodeId, networkId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete node' });
  }
}
