import axios from 'axios';
import type {
  Network,
  NetworkDetail,
  NetworkNode,
  NetworkEdge,
  BFSResult,
  DFSResult,
  DijkstraResult,
  ComparisonResult,
  NetworkRiskResult,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for HttpOnly JWT cookies
});

// ─── Networks ────────────────────────────────────────────────────────────────

export const networkService = {
  list: (): Promise<Network[]> =>
    api.get('/networks').then((r) => r.data),

  get: (id: string): Promise<NetworkDetail> =>
    api.get(`/networks/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string }): Promise<Network> =>
    api.post('/networks', data).then((r) => r.data),

  update: (id: string, data: { name: string; description?: string }): Promise<Network> =>
    api.put(`/networks/${id}`, data).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/networks/${id}`).then(() => undefined),

  export: (id: string): Promise<{ network: Network; nodes: NetworkNode[]; edges: NetworkEdge[] }> =>
    api.get(`/networks/${id}/export`).then((r) => r.data),

  importJSON: (payload: any): Promise<{ message: string; network: Network }> =>
    api.post(`/networks/import`, payload).then((r) => r.data),
};

// ─── Nodes ───────────────────────────────────────────────────────────────────

export const nodeService = {
  create: (
    networkId: string,
    data: {
      name: string;
      type: string;
      criticality: string;
      vulnerabilityScore: number;
      positionX?: number;
      positionY?: number;
    }
  ): Promise<NetworkNode> =>
    api.post(`/networks/${networkId}/nodes`, data).then((r) => r.data),

  update: (
    networkId: string,
    nodeId: string,
    data: Partial<{
      name: string;
      type: string;
      criticality: string;
      vulnerabilityScore: number;
      positionX: number;
      positionY: number;
    }>
  ): Promise<NetworkNode> =>
    api.put(`/networks/${networkId}/nodes/${nodeId}`, data).then((r) => r.data),

  delete: (networkId: string, nodeId: string): Promise<void> =>
    api.delete(`/networks/${networkId}/nodes/${nodeId}`).then(() => undefined),
};

// ─── Edges ───────────────────────────────────────────────────────────────────

export const edgeService = {
  create: (
    networkId: string,
    data: {
      sourceNodeId: string;
      targetNodeId: string;
      cost: number;
      risk: number;
      directed: boolean;
      status?: string;
    }
  ): Promise<NetworkEdge> =>
    api.post(`/networks/${networkId}/edges`, data).then((r) => r.data),

  update: (
    networkId: string,
    edgeId: string,
    data: Partial<{ cost: number; risk: number; directed: boolean; status: string }>
  ): Promise<NetworkEdge> =>
    api.put(`/networks/${networkId}/edges/${edgeId}`, data).then((r) => r.data),

  delete: (networkId: string, edgeId: string): Promise<void> =>
    api.delete(`/networks/${networkId}/edges/${edgeId}`).then(() => undefined),
};

// ─── Analysis ────────────────────────────────────────────────────────────────

export const analysisService = {
  bfs: (networkId: string, sourceNodeId: string): Promise<BFSResult> =>
    api.post('/analysis/bfs', { networkId, sourceNodeId }).then((r) => r.data),

  dfs: (networkId: string, sourceNodeId: string): Promise<DFSResult> =>
    api.post('/analysis/dfs', { networkId, sourceNodeId }).then((r) => r.data),

  dijkstra: (networkId: string, sourceNodeId: string, targetNodeId: string): Promise<DijkstraResult> =>
    api.post('/analysis/dijkstra', { networkId, sourceNodeId, targetNodeId }).then((r) => r.data),

  compare: (networkId: string, sourceNodeId: string, targetNodeId: string): Promise<ComparisonResult> =>
    api.post('/analysis/compare', { networkId, sourceNodeId, targetNodeId }).then((r) => r.data),

  risk: (networkId: string, path?: string[]): Promise<NetworkRiskResult> =>
    api.post('/analysis/risk', { networkId, path }).then((r) => r.data),

  downloadReport: async (networkId: string, sourceNodeId?: string, targetNodeId?: string, algorithm?: string) => {
    const response = await api.post('/analysis/report',
      { networkId, sourceNodeId, targetNodeId, algorithm },
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    const disposition = response.headers['content-disposition'];
    let filename = `cybergraph-analysis.pdf`;
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

// ─── Monitoring ──────────────────────────────────────────────────────────────

export const monitoringService = {
  get: (networkId: string) => api.get(`/monitoring/networks/${networkId}`).then(r => r.data),
  updateNodeStatus: (networkId: string, nodeId: string, status: string) =>
    api.put(`/monitoring/networks/${networkId}/nodes/${nodeId}/status`, { status }).then(r => r.data),
  createEventSource: (networkId: string) => {
    return new EventSource(`http://localhost:3001/api/monitoring/networks/${networkId}/stream`);
  }
};

// ─── Simulation ──────────────────────────────────────────────────────────────

export const simulationService = {
  runAttack: (params: {
    networkId: string;
    entryNodeId: string;
    targetNodeId?: string;
    maxDepth: number;
    blockedNodeIds?: string[];
    blockedEdgeIds?: string[];
  }) => api.post('/simulation/attack', params).then(r => r.data)
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  login: (data: any) => api.post('/auth/login', data).then(r => r.data),
  register: (data: any) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data)
};
