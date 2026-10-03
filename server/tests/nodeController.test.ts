import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateNode } from '../src/controllers/nodeController';
import type { Request, Response } from 'express';

// Mock prisma
const mockUpdate = vi.fn();
vi.mock('../src/services/prisma', () => ({
  default: {
    node: {
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

describe('nodeController.updateNode', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = {
      params: { networkId: 'net1', nodeId: 'node1' },
      body: {},
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('1. Valid position update succeeds and 2. x/y are stored correctly', async () => {
    req.body = { positionX: 420, positionY: 180 };
    mockUpdate.mockResolvedValueOnce({ id: 'node1', positionX: 420, positionY: 180 });

    await updateNode(req as Request, res as Response);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'node1', networkId: 'net1' },
      data: { positionX: 420, positionY: 180 },
    });
    expect(jsonMock).toHaveBeenCalledWith({ id: 'node1', positionX: 420, positionY: 180 });
  });

  it('3. Invalid x is rejected', async () => {
    req.body = { positionX: NaN, positionY: 180 };

    await updateNode(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'positionX must be a finite number' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('4. Invalid y is rejected', async () => {
    req.body = { positionX: 420, positionY: 'Infinity' };

    await updateNode(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'positionY must be a finite number' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('5. Updating position does not modify unrelated node fields', async () => {
    req.body = { positionX: 100 };
    mockUpdate.mockResolvedValueOnce({ id: 'node1', positionX: 100, name: 'OldName' });

    await updateNode(req as Request, res as Response);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'node1', networkId: 'net1' },
      data: { positionX: 100 },
    });
  });
});
