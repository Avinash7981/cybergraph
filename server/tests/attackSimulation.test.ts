import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSimulation } from '../src/controllers/simulationController';
import type { Request, Response } from 'express';
import prisma from '../src/services/prisma';

vi.mock('../src/services/prisma', () => {
  return {
    default: {
      network: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('attackSimulation', () => {
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

  it('performs BFS propagation and respects maxDepth', async () => {
    req.body = {
      networkId: 'net-1',
      entryNodeId: 'n1',
      maxDepth: 1
    };

    vi.mocked(prisma.network.findUnique).mockResolvedValueOnce({
      id: 'net-1',
      nodes: [
        { id: 'n1', name: 'N1', type: 'ROUTER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n2', name: 'N2', type: 'SERVER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n3', name: 'N3', type: 'DATABASE', criticality: 'HIGH', vulnerabilityScore: 5 },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', cost: 1, risk: 1, directed: true, status: 'ACTIVE' },
        { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', cost: 1, risk: 1, directed: true, status: 'ACTIVE' },
      ]
    } as any);

    await runSimulation(req as Request, res as Response);
    
    // Depth 1 means n1 -> n2 are compromised, n3 is at depth 2 (so at risk or unaffected).
    // Wait, BFS stops AT maxDepth. So n1 (depth 0) explores its neighbors -> n2 (depth 1).
    // Queue processes n2 (depth 1) -> depth >= maxDepth -> continue (so it doesn't explore e2).
    // So compromised = [n1, n2]. At risk: n3 is adjacent to compromised node n2. So at risk = [n3].
    
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      targetReached: false,
      compromisedNodes: ['n1', 'n2'],
      atRiskNodes: ['n3'],
      depth: 1
    }));
  });

  it('stops propagation if node is blocked', async () => {
    req.body = {
      networkId: 'net-1',
      entryNodeId: 'n1',
      maxDepth: 10,
      blockedNodeIds: ['n2']
    };

    vi.mocked(prisma.network.findUnique).mockResolvedValueOnce({
      id: 'net-1',
      nodes: [
        { id: 'n1', name: 'N1', type: 'ROUTER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n2', name: 'N2', type: 'SERVER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n3', name: 'N3', type: 'DATABASE', criticality: 'HIGH', vulnerabilityScore: 5 },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', cost: 1, risk: 1, directed: true, status: 'ACTIVE' },
        { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', cost: 1, risk: 1, directed: true, status: 'ACTIVE' },
      ]
    } as any);

    await runSimulation(req as Request, res as Response);
    
    // N2 is blocked. Compromised = [N1]. N2 is not added to atRisk because it is blocked.
    // N3 is not reachable.
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      compromisedNodes: ['n1'],
      atRiskNodes: [],
      blockedNodes: ['n2']
    }));
  });

  it('detects target reached and calculates total cost', async () => {
    req.body = {
      networkId: 'net-1',
      entryNodeId: 'n1',
      targetNodeId: 'n3',
      maxDepth: 10
    };

    vi.mocked(prisma.network.findUnique).mockResolvedValueOnce({
      id: 'net-1',
      nodes: [
        { id: 'n1', name: 'N1', type: 'ROUTER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n2', name: 'N2', type: 'SERVER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n3', name: 'N3', type: 'DATABASE', criticality: 'HIGH', vulnerabilityScore: 5 },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', cost: 5, risk: 1, directed: true, status: 'ACTIVE' },
        { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', cost: 10, risk: 1, directed: true, status: 'ACTIVE' },
      ]
    } as any);

    await runSimulation(req as Request, res as Response);
    
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      targetReached: true,
      attackPath: ['n1', 'n2', 'n3'],
      totalCost: 15
    }));
  });
  
  it('cannot traverse inactive edges', async () => {
    req.body = {
      networkId: 'net-1',
      entryNodeId: 'n1',
      maxDepth: 10
    };

    vi.mocked(prisma.network.findUnique).mockResolvedValueOnce({
      id: 'net-1',
      nodes: [
        { id: 'n1', name: 'N1', type: 'ROUTER', criticality: 'HIGH', vulnerabilityScore: 5 },
        { id: 'n2', name: 'N2', type: 'SERVER', criticality: 'HIGH', vulnerabilityScore: 5 }
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', cost: 1, risk: 1, directed: true, status: 'ISOLATED' },
      ]
    } as any);

    await runSimulation(req as Request, res as Response);
    
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      compromisedNodes: ['n1'],
      atRiskNodes: [],
    }));
  });
});
