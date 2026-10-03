import { Request, Response } from 'express';
import prisma from '../services/prisma';

// Simple pub/sub mechanism for SSE within a single Node.js instance
type Subscriber = (event: any) => void;
const subscribers = new Map<string, Set<Subscriber>>();

function publishEvent(networkId: string, event: any) {
  const subs = subscribers.get(networkId);
  if (subs) {
    for (const sub of subs) {
      sub(event);
    }
  }
}

// GET /api/monitoring/networks/:networkId
export async function getMonitoringState(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    
    const network = await prisma.network.findUnique({
      where: { id: networkId },
      include: {
        nodes: {
          select: {
            id: true,
            name: true,
            status: true,
            lastSeen: true,
            vulnerabilityScore: true,
            criticality: true,
          }
        },
        monitoringEvents: {
          orderBy: { timestamp: 'desc' },
          take: 20
        }
      }
    });

    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }

    res.json({
      networkId: network.id,
      timestamp: new Date(),
      nodes: network.nodes,
      events: network.monitoringEvents,
    });
  } catch (error) {
    console.error('getMonitoringState error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring state' });
  }
}

// PUT /api/monitoring/networks/:networkId/nodes/:nodeId/status
export async function updateNodeStatus(req: Request, res: Response): Promise<void> {
  try {
    const networkId = req.params.networkId as string;
    const nodeId = req.params.nodeId as string;
    const { status } = req.body;

    if (!['ACTIVE', 'DEGRADED', 'OFFLINE'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    // Must be transactional:
    const result = await prisma.$transaction(async (tx) => {
      const node = await tx.node.findUnique({
        where: { id: nodeId },
        select: { networkId: true, status: true, name: true }
      });

      if (!node) {
        throw new Error('Node not found');
      }
      
      if (node.networkId !== networkId) {
        throw new Error('Node belongs to another network');
      }

      if (node.status === status) {
        return { updated: false, node }; // No change
      }

      const updatedNode = await tx.node.update({
        where: { id: nodeId },
        data: {
          status,
          lastSeen: new Date()
        }
      });

      const event = await tx.monitoringEvent.create({
        data: {
          networkId,
          entityType: 'NODE',
          entityId: nodeId,
          previousStatus: node.status,
          currentStatus: status,
          eventType: 'node.status.changed'
        }
      });

      return { updated: true, event, node: updatedNode };
    });

    if (result.updated && result.event) {
      // Publish via SSE
      publishEvent(networkId, {
        type: 'node.status.changed',
        nodeId,
        nodeName: result.node.name,
        status,
        previousStatus: result.event.previousStatus,
        timestamp: result.event.timestamp,
        eventId: result.event.id
      });
    }

    res.json({ success: true, updated: result.updated });
  } catch (error: any) {
    console.error('updateNodeStatus error:', error);
    if (error.message === 'Node not found') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Node belongs to another network') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
}

// GET /api/monitoring/networks/:networkId/stream
export function streamMonitoringEvents(req: Request, res: Response): void {
  const networkId = req.params.networkId as string;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Establish SSE

  // Keep alive
  const keepAliveId = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  const subscriber: Subscriber = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (!subscribers.has(networkId)) {
    subscribers.set(networkId, new Set());
  }
  subscribers.get(networkId)!.add(subscriber);

  req.on('close', () => {
    clearInterval(keepAliveId);
    const subs = subscribers.get(networkId);
    if (subs) {
      subs.delete(subscriber);
      if (subs.size === 0) {
        subscribers.delete(networkId);
      }
    }
  });
}
