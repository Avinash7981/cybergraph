import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReport } from '../src/controllers/analysisController';
import type { Request, Response } from 'express';

const mockFindUnique = vi.fn();
vi.mock('../src/services/prisma', () => ({
  default: {
    network: {
      findUnique: (args: any) => mockFindUnique(args),
    },
  },
}));

describe('generateReport Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;
  let sendMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();
    sendMock = vi.fn();
    req = { body: {} };
    res = { status: statusMock, json: jsonMock, setHeader: setHeaderMock, send: sendMock };
  });

  it('2. Unknown network returns 404', async () => {
    req.body = { networkId: 'unknown' };
    mockFindUnique.mockResolvedValueOnce(null);
    
    await generateReport(req as Request, res as Response);
    
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Network not found' });
  });

  it('1. Existing network generates PDF and 3. PDF response has correct content type', async () => {
    req.body = { networkId: 'net-1' };
    mockFindUnique.mockResolvedValue({
      id: 'net-1',
      name: 'Test Network',
      description: 'Test Desc',
      createdAt: new Date(),
      nodes: [],
      edges: []
    });
    
    await generateReport(req as Request, res as Response);
    
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="cybergraph-test_network-analysis.pdf"'));
    expect(sendMock).toHaveBeenCalledWith(expect.any(Buffer));
    expect(sendMock.mock.calls[0][0].length).toBeGreaterThan(0); // 4. PDF is non-empty
  });
  
  it('10. Empty network generates a valid report', async () => {
    req.body = { networkId: 'net-empty' };
    mockFindUnique.mockResolvedValue({
      id: 'net-empty',
      name: 'Empty Net',
      createdAt: new Date(),
      nodes: [],
      edges: []
    });
    
    await generateReport(req as Request, res as Response);
    
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(sendMock).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('11. Special characters in network names do not break filename generation', async () => {
    req.body = { networkId: 'net-spec' };
    mockFindUnique.mockResolvedValue({
      id: 'net-spec',
      name: 'Test! @ Network #123',
      createdAt: new Date(),
      nodes: [],
      edges: []
    });
    
    await generateReport(req as Request, res as Response);
    
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="cybergraph-test____network__123-analysis.pdf"');
  });
});
