import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEdge } from '../src/controllers/edgeController';
import type { Request, Response } from 'express';

// Mock prisma
const mockCreate = vi.fn();
vi.mock('../src/services/prisma', () => ({
  default: {
    edge: {
      create: (...args: any[]) => mockCreate(...args),
    },
    node: {
      findUnique: vi.fn().mockResolvedValue({ id: 'node1' }),
    },
  },
}));

describe('edgeController.createEdge', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = {
      params: { networkId: 'net1' },
      body: {
        sourceNodeId: 'node1',
        targetNodeId: 'node2',
        risk: 5,
        directed: true,
        status: 'ACTIVE'
      },
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('accepts cost = 1', async () => {
    req.body.cost = 1;
    mockCreate.mockResolvedValueOnce({ id: 'edge1', cost: 1 });
    await createEdge(req as Request, res as Response);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cost: 1 })
    }));
  });

  it('accepts cost = 5', async () => {
    req.body.cost = 5;
    mockCreate.mockResolvedValueOnce({ id: 'edge1', cost: 5 });
    await createEdge(req as Request, res as Response);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cost: 5 })
    }));
  });

  it('accepts cost = 10', async () => {
    req.body.cost = 10;
    mockCreate.mockResolvedValueOnce({ id: 'edge1', cost: 10 });
    await createEdge(req as Request, res as Response);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cost: 10 })
    }));
  });

  it('accepts decimal cost', async () => {
    req.body.cost = 1.5;
    mockCreate.mockResolvedValueOnce({ id: 'edge1', cost: 1.5 });
    await createEdge(req as Request, res as Response);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cost: 1.5 })
    }));
  });

  it('rejects cost = 0', async () => {
    req.body.cost = 0;
    await createEdge(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Cost must be a positive number' });
  });

  it('rejects negative cost', async () => {
    req.body.cost = -5;
    await createEdge(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Cost must be a positive number' });
  });

  it('rejects empty cost', async () => {
    req.body.cost = undefined;
    await createEdge(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Cost must be a positive number' });
  });
});
