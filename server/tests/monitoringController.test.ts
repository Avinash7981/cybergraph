import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMonitoringState, updateNodeStatus } from '../src/controllers/monitoringController';
import type { Request, Response } from 'express';
import prisma from '../src/services/prisma';

vi.mock('../src/services/prisma', () => {
  return {
    default: {
      network: {
        findUnique: vi.fn(),
      },
      node: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      monitoringEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)), // Mocks transaction by just executing callback with prisma
    },
  };
});

describe('monitoringController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = { params: {}, body: {} };
    res = { status: statusMock, json: jsonMock };
  });

  it('1. Current monitoring state loads', async () => {
    req.params = { networkId: 'net-1' };
    vi.mocked(prisma.network.findUnique).mockResolvedValueOnce({
      id: 'net-1',
      nodes: [{ id: 'n1', status: 'ACTIVE' }],
      monitoringEvents: []
    } as any);

    await getMonitoringState(req as Request, res as Response);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      networkId: 'net-1',
      nodes: expect.any(Array),
      events: expect.any(Array)
    }));
  });

  it('2. Valid status update succeeds and 5. creates event', async () => {
    req.params = { networkId: 'net-1', nodeId: 'n1' };
    req.body = { status: 'DEGRADED' };

    vi.mocked(prisma.node.findUnique).mockResolvedValueOnce({
      networkId: 'net-1',
      status: 'ACTIVE',
      name: 'Test Node'
    } as any);
    
    vi.mocked(prisma.node.update).mockResolvedValueOnce({ id: 'n1', status: 'DEGRADED' } as any);
    vi.mocked(prisma.monitoringEvent.create).mockResolvedValueOnce({
      id: 'evt1',
      timestamp: new Date()
    } as any);

    await updateNodeStatus(req as Request, res as Response);

    expect(prisma.node.update).toHaveBeenCalled();
    expect(prisma.monitoringEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        previousStatus: 'ACTIVE',
        currentStatus: 'DEGRADED'
      })
    }));
    expect(jsonMock).toHaveBeenCalledWith({ success: true, updated: true });
  });

  it('3. Invalid status rejected', async () => {
    req.params = { networkId: 'net-1', nodeId: 'n1' };
    req.body = { status: 'FAKE_STATUS' };

    await updateNodeStatus(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('4. Node belonging to another network rejected', async () => {
    req.params = { networkId: 'net-1', nodeId: 'n1' };
    req.body = { status: 'DEGRADED' };

    vi.mocked(prisma.node.findUnique).mockResolvedValueOnce({
      networkId: 'other-net',
      status: 'ACTIVE',
      name: 'Test Node'
    } as any);

    await updateNodeStatus(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Node belongs to another network' });
  });

  it('6. Same status does not create duplicate event', async () => {
    req.params = { networkId: 'net-1', nodeId: 'n1' };
    req.body = { status: 'ACTIVE' };

    vi.mocked(prisma.node.findUnique).mockResolvedValueOnce({
      networkId: 'net-1',
      status: 'ACTIVE',
      name: 'Test Node'
    } as any);

    await updateNodeStatus(req as Request, res as Response);
    expect(prisma.node.update).not.toHaveBeenCalled();
    expect(prisma.monitoringEvent.create).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({ success: true, updated: false });
  });
});
