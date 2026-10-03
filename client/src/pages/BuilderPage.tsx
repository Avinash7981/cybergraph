import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import type { NetworkDetail, NetworkNode, NetworkEdge } from '../types';
import { networkService, nodeService, edgeService } from '../services/api';
import { NetworkGraph } from '../graph/NetworkGraph';
import { NodeForm } from '../components/NodeForm';
import { EdgeForm } from '../components/EdgeForm';

type ModalState =
  | { type: 'none' }
  | { type: 'add-node' }
  | { type: 'edit-node'; node: NetworkNode }
  | { type: 'add-edge'; sourceId?: string; targetId?: string }
  | { type: 'edit-edge'; edge: NetworkEdge };

export function BuilderPage() {
  const { networkId } = useParams<{ networkId: string }>();
  const navigate = useNavigate();

  const [network, setNetwork] = useState<NetworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!networkId) return;
    try {
      setLoading(true);
      const data = await networkService.get(networkId);
      setNetwork(data);
      setError('');
    } catch {
      setError('Failed to load network');
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddNode(data: { name: string; type: string; criticality: string; vulnerabilityScore: number }) {
    if (!networkId) return;
    await nodeService.create(networkId, data);
    setModal({ type: 'none' });
    await load();
  }

  async function handleEditNode(node: NetworkNode, data: { name: string; type: string; criticality: string; vulnerabilityScore: number }) {
    if (!networkId) return;
    await nodeService.update(networkId, node.id, data);
    setModal({ type: 'none' });
    await load();
  }

  async function handleDeleteNode(nodeId: string) {
    if (!networkId || !confirm('Delete this node and all its connections?')) return;
    setSaving(true);
    try {
      await nodeService.delete(networkId, nodeId);
      setSelectedNodeId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddEdge(data: { sourceNodeId: string; targetNodeId: string; cost: number; risk: number; directed: boolean; status: string }) {
    if (!networkId) return;
    await edgeService.create(networkId, data);
    setModal({ type: 'none' });
    await load();
  }

  async function handleEditEdge(edge: NetworkEdge, data: Partial<{ cost: number; risk: number; directed: boolean; status: string }>) {
    if (!networkId) return;
    await edgeService.update(networkId, edge.id, data);
    setModal({ type: 'none' });
    await load();
  }

  async function handleDeleteEdge(edgeId: string) {
    if (!networkId || !confirm('Delete this connection?')) return;
    setSaving(true);
    try {
      await edgeService.delete(networkId, edgeId);
      setSelectedEdgeId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!networkId) return;
    const data = await networkService.export(networkId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${network?.name ?? 'network'}.cybergraph.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handlePositionChange = useCallback((nodeId: string, x: number, y: number) => {
    setNetwork(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId ? { ...n, positionX: x, positionY: y } : n
        )
      };
    });
  }, []);

  const selectedNode = network?.nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = network?.edges.find(e => e.id === selectedEdgeId);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-text-dim)' }} className="pulse-copper">
          LOADING NETWORK…
        </div>
      </div>
    );
  }

  if (error || !network) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: 'var(--cg-threat)', fontSize: 13 }}>{error || 'Network not found'}</div>
        <button className="cg-btn cg-btn-ghost" onClick={() => navigate('/')}>← Back to Networks</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 44,
        background: 'var(--cg-surface)',
        borderBottom: '1px solid var(--cg-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}>
        <button className="cg-btn cg-btn-ghost cg-btn-sm" onClick={() => navigate('/')}>← Networks</button>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cg-text)' }}>{network.name}</span>
          {network.description && (
            <span style={{ fontSize: 11, color: 'var(--cg-text-dim)', marginLeft: 10 }}>{network.description}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)', alignSelf: 'center' }}>
            {network.nodes.length}V / {network.edges.length}E
          </span>
          <button className="cg-btn cg-btn-ghost cg-btn-sm" onClick={handleExport}>
            ↓ Export
          </button>
          <button
            className="cg-btn cg-btn-ghost cg-btn-sm"
            onClick={() => navigate(`/analysis/${networkId}`)}
          >
            ⌬ Analyze
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: 260,
          flexShrink: 0,
          background: 'var(--cg-surface)',
          borderRight: '1px solid var(--cg-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Nodes section */}
          <div style={{ borderBottom: '1px solid var(--cg-border)' }}>
            <div className="panel-header">
              <span className="panel-title">Nodes ({network.nodes.length})</span>
              <button
                className="cg-btn cg-btn-primary cg-btn-sm"
                onClick={() => setModal({ type: 'add-node' })}
                style={{ marginLeft: 'auto' }}
              >
                + Add
              </button>
            </div>

            {network.nodes.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--cg-text-dim)', fontSize: 11 }}>
                No nodes yet.
              </div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 240 }}>
                {network.nodes.map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(n => n === node.id ? null : node.id)}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cg-border)',
                      background: selectedNodeId === node.id ? 'rgba(182,106,60,0.08)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--cg-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.name}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 5px',
                        borderRadius: 2,
                        background: 'var(--cg-bg)',
                        color: 'var(--cg-text-muted)',
                        flexShrink: 0,
                      }}>
                        {node.type}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--cg-text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      v:{node.vulnerabilityScore.toFixed(1)} · {node.criticality}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edges section */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span className="panel-title">Connections ({network.edges.length})</span>
              <button
                className="cg-btn cg-btn-primary cg-btn-sm"
                onClick={() => setModal({ type: 'add-edge' })}
                style={{ marginLeft: 'auto' }}
                disabled={network.nodes.length < 2}
                title={network.nodes.length < 2 ? 'Need at least 2 nodes' : ''}
              >
                + Add
              </button>
            </div>

            {network.edges.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--cg-text-dim)', fontSize: 11 }}>
                {network.nodes.length < 2 ? 'Add 2+ nodes first.' : 'Add connections to create the network graph.'}
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {network.edges.map(edge => {
                  const src = network.nodes.find(n => n.id === edge.sourceNodeId);
                  const tgt = network.nodes.find(n => n.id === edge.targetNodeId);
                  return (
                    <div
                      key={edge.id}
                      onClick={() => setSelectedEdgeId(e => e === edge.id ? null : edge.id)}
                      style={{
                        padding: '7px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--cg-border)',
                        background: selectedEdgeId === edge.id ? 'rgba(182,106,60,0.08)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--cg-text)', fontFamily: 'var(--font-mono)' }}>
                        {src?.name ?? '?'} {edge.directed ? '→' : '↔'} {tgt?.name ?? '?'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--cg-text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        cost:{edge.cost} · risk:{edge.risk} ·
                        <span style={{ color: edge.status === 'ACTIVE' ? 'var(--cg-healthy)' : 'var(--cg-threat-dim)', marginLeft: 3 }}>
                          {edge.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Graph canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlowProvider>
            <NetworkGraph
              networkId={networkId!}
              dbNodes={network.nodes}
              dbEdges={network.edges}
              onNodeSelect={setSelectedNodeId}
              onRequestAddEdge={(sourceId, targetId) =>
                setModal({ type: 'add-edge', sourceId, targetId })
              }
              onPositionChange={handlePositionChange}
              readOnly={false}
            />
          </ReactFlowProvider>

          {/* Selection info panel */}
          {(selectedNode || selectedEdge) && (
            <div style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'var(--cg-surface)',
              border: '1px solid var(--cg-border)',
              borderRadius: 6,
              padding: '12px 14px',
              minWidth: 220,
              maxWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }} className="fade-in">
              {selectedNode && (
                <>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Selected Node
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cg-text)', marginBottom: 6 }}>{selectedNode.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    Type: {selectedNode.type}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    Criticality: {selectedNode.criticality}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                    Vuln Score: {selectedNode.vulnerabilityScore.toFixed(1)}/10
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="cg-btn cg-btn-ghost cg-btn-sm"
                      onClick={() => setModal({ type: 'edit-node', node: selectedNode })}
                    >
                      Edit
                    </button>
                    <button
                      className="cg-btn cg-btn-danger cg-btn-sm"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
              {selectedEdge && !selectedNode && (
                <>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Selected Connection
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    {network.nodes.find(n => n.id === selectedEdge.sourceNodeId)?.name ?? '?'} {selectedEdge.directed ? '→' : '↔'} {network.nodes.find(n => n.id === selectedEdge.targetNodeId)?.name ?? '?'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    Cost: {selectedEdge.cost}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cg-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    Risk: {selectedEdge.risk}/10
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 10, color: selectedEdge.status === 'ACTIVE' ? 'var(--cg-healthy)' : 'var(--cg-threat)' }}>
                    {selectedEdge.status}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="cg-btn cg-btn-ghost cg-btn-sm"
                      onClick={() => setModal({ type: 'edit-edge', edge: selectedEdge })}
                    >
                      Edit
                    </button>
                    <button
                      className="cg-btn cg-btn-danger cg-btn-sm"
                      onClick={() => handleDeleteEdge(selectedEdge.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'add-node' && (
        <NodeForm
          title="Add Node"
          onSubmit={handleAddNode}
          onCancel={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'edit-node' && (
        <NodeForm
          title="Edit Node"
          initial={modal.node}
          onSubmit={(data) => handleEditNode(modal.node, data)}
          onCancel={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'add-edge' && (
        <EdgeForm
          title="Add Connection"
          nodes={network.nodes}
          preselectedSource={modal.sourceId}
          preselectedTarget={modal.targetId}
          onSubmit={handleAddEdge}
          onCancel={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'edit-edge' && (
        <EdgeForm
          title="Edit Connection"
          nodes={network.nodes}
          initial={modal.edge}
          onSubmit={(data) => handleEditEdge(modal.edge, data)}
          onCancel={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  );
}
