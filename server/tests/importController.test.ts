import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importNetwork } from '../src/controllers/networkController';
import type { Request, Response } from 'express';

const mockTransaction = vi.fn();
vi.mock('../src/services/prisma', () => ({
  default: {
    $transaction: (cb: any) => mockTransaction(cb),
  },
}));

describe('networkController.importNetwork', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = { body: {} };
    res = { status: statusMock, json: jsonMock };
  });

  const validPayload = {
    network: { name: 'Test Net', description: 'desc' },
    nodes: [
      { id: 'n1', name: 'Gateway', type: 'INTERNET', criticality: 'LOW', vulnerabilityScore: 5, positionX: 10, positionY: 20 },
      { id: 'n2', name: 'Firewall', type: 'FIREWALL', criticality: 'HIGH', vulnerabilityScore: 2, positionX: 50, positionY: 60 }
    ],
    edges: [
      { sourceNodeId: 'n1', targetNodeId: 'n2', cost: 10, risk: 5, directed: true, status: 'ACTIVE' }
    ]
  };

  it('1. Valid exported JSON imports successfully', async () => {
    req.body = validPayload;
    mockTransaction.mockResolvedValueOnce({ id: 'new-net' });

    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network imported successfully' }));
  });

  it('6. Invalid JSON is rejected (missing network)', async () => {
    req.body = { nodes: [], edges: [] };
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing or invalid network object' }));
  });

  it('7. Missing network name is rejected', async () => {
    req.body = { ...validPayload, network: { name: '' } };
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Network name is required' }));
  });

  it('8. Invalid vulnerability score is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.nodes[0].vulnerabilityScore = 15;
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('invalid vulnerability score') }));
  });

  it('9. Negative edge cost is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.edges[0].cost = -5;
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Edge cost must be greater than 0') }));
  });

  it('10. Zero edge cost is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.edges[0].cost = 0;
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Edge cost must be greater than 0') }));
  });

  it('11. Invalid source reference is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.edges[0].sourceNodeId = 'unknown';
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('unknown source node') }));
  });

  it('14. Duplicate node identifiers are rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.nodes.push(payload.nodes[0]);
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Duplicate node identifier') }));
  });

  it('15. NaN position is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.nodes[0].positionX = NaN;
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('invalid positionX') }));
  });

  it('16. Infinity position is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.nodes[0].positionY = Infinity;
    req.body = payload;
    await importNetwork(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('invalid positionY') }));
  });
});
