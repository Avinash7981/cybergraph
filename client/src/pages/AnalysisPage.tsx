import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import type {
  NetworkDetail,
  BFSResult,
  DFSResult,
  DijkstraResult,
  ComparisonResult,
  NetworkRiskResult,
  MonitoringEvent,
  SimulationResult,
} from '../types';
import { networkService, analysisService, monitoringService, simulationService } from '../services/api';
import { NetworkGraph } from '../graph/NetworkGraph';

type Algorithm = 'BFS' | 'DFS' | 'DIJKSTRA' | 'COMPARE';
type AnyResult = BFSResult | DFSResult | DijkstraResult | ComparisonResult | null;

function PathDisplay({ path, names }: { path: string[]; names: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      {path.map((id, i) => (
        <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            background: 'rgba(182,106,60,0.1)',
            border: '1px solid var(--cg-copper-dim)',
            borderRadius: 3,
            padding: '2px 7px',
            color: 'var(--cg-copper-light)',
          }}>
            {names[id] ?? id}
          </span>
          {i < path.length - 1 && <span style={{ color: 'var(--cg-text-dim)' }}>→</span>}
        </span>
      ))}
    </div>
  );
}

function TraversalList({ ids, names, label }: { ids: string[]; names: Record<string, string>; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 6 }}>
        {label} ({ids.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {ids.map((id, i) => (
          <span key={id} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            background: 'var(--cg-bg)',
            border: '1px solid var(--cg-border)',
            borderRadius: 3,
            padding: '2px 6px',
            color: 'var(--cg-text-muted)',
          }}>
            {i + 1}. {names[id] ?? id}
          </span>
        ))}
      </div>
    </div>
  );
}

function ComplexityTag({ time, space }: { time: string; space: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>
        T: <span style={{ color: 'var(--cg-copper)' }}>{time}</span>
      </span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>
        S: <span style={{ color: 'var(--cg-copper)' }}>{space}</span>
      </span>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, forceOpen = false, children }: { title: string, defaultOpen?: boolean, forceOpen?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  useEffect(() => { if (forceOpen) setIsOpen(true); }, [forceOpen]);
  return (
    <div style={{ borderTop: '1px solid var(--cg-border)', background: 'var(--cg-bg)' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--cg-text-dim)'
        }}
      >
        <span>{title}</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '0 16px 14px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function AnalysisPage() {
  const { networkId } = useParams<{ networkId: string }>();
  const navigate = useNavigate();

  const [network, setNetwork] = useState<NetworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [algorithm, setAlgorithm] = useState<Algorithm>('DIJKSTRA');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AnyResult>(null);
  const [runError, setRunError] = useState('');
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());
  const [networkRisk, setNetworkRisk] = useState<NetworkRiskResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Monitoring state
  const [monitoringEvents, setMonitoringEvents] = useState<MonitoringEvent[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, string>>({});

  // Simulation state
  const [mode, setMode] = useState<'ANALYSIS' | 'SIMULATION'>('ANALYSIS');
  const [simEntryNodeId, setSimEntryNodeId] = useState('');
  const [simTargetNodeId, setSimTargetNodeId] = useState('');
  const [simMaxDepth, setSimMaxDepth] = useState(10);
  const [simBlockedNodes, setSimBlockedNodes] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const load = useCallback(async () => {
    if (!networkId) return;
    try {
      setLoading(true);
      const [data, riskData] = await Promise.all([
        networkService.get(networkId),
        analysisService.risk(networkId)
      ]);
      setNetwork(data);
      setNetworkRisk(riskData);
      // Also fetch monitoring state
      try {
        const monData = await monitoringService.get(networkId);
        setMonitoringEvents(monData.events);
        const statuses: Record<string, string> = {};
        monData.nodes.forEach((n: any) => {
          if (n.status) statuses[n.id] = n.status;
        });
        setNodeStatuses(statuses);
      } catch (err) {
        console.error('Failed to load monitoring state', err);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!networkId) return;

    const es = monitoringService.createEventSource(networkId);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'node.status.changed') {
          setNodeStatuses(prev => ({ ...prev, [data.nodeId]: data.status }));

          const newEvent: MonitoringEvent = {
            id: data.eventId,
            networkId: networkId,
            entityType: 'NODE',
            entityId: data.nodeId,
            previousStatus: data.previousStatus || '',
            currentStatus: data.status,
            eventType: data.type,
            timestamp: data.timestamp
          };

          setMonitoringEvents(prev => {
            const filtered = prev.filter(e => e.id !== newEvent.id);
            return [newEvent, ...filtered].slice(0, 20);
          });
        }
      } catch (e) {
        console.error('Error parsing SSE event', e);
      }
    };

    return () => {
      es.close();
    };
  }, [networkId]);

  async function runAnalysis() {
    if (!networkId || !sourceId || !network) return;
    if ((algorithm === 'DIJKSTRA' || algorithm === 'COMPARE') && !targetId) return;

    setRunning(true);
    setRunError('');
    setResult(null);
    setHighlightedNodeIds(new Set());
    setHighlightedEdgeIds(new Set());

    try {
      let res: AnyResult;
      let edgesToHighlight = new Set<string>();

      switch (algorithm) {
        case 'BFS':
          res = await analysisService.bfs(networkId, sourceId);
          setHighlightedNodeIds(new Set((res as BFSResult).visitedNodes));
          Object.entries((res as BFSResult).parent).forEach(([node, parent]) => {
            if (parent) {
              const edge = network.edges.find(e =>
                (e.sourceNodeId === parent && e.targetNodeId === node) ||
                (!e.directed && e.sourceNodeId === node && e.targetNodeId === parent)
              );
              if (edge) edgesToHighlight.add(edge.id);
            }
          });
          break;
        case 'DFS':
          res = await analysisService.dfs(networkId, sourceId);
          setHighlightedNodeIds(new Set((res as DFSResult).visitedNodes));
          Object.entries((res as DFSResult).parent).forEach(([node, parent]) => {
            if (parent) {
              const edge = network.edges.find(e =>
                (e.sourceNodeId === parent && e.targetNodeId === node) ||
                (!e.directed && e.sourceNodeId === node && e.targetNodeId === parent)
              );
              if (edge) edgesToHighlight.add(edge.id);
            }
          });
          break;
        case 'DIJKSTRA':
          res = await analysisService.dijkstra(networkId, sourceId, targetId);
          const dijkstraPath = (res as DijkstraResult).path;
          setHighlightedNodeIds(new Set(dijkstraPath));
          for (let i = 0; i < dijkstraPath.length - 1; i++) {
            const u = dijkstraPath[i];
            const v = dijkstraPath[i + 1];
            const edge = network.edges.find(e =>
              (e.sourceNodeId === u && e.targetNodeId === v) ||
              (!e.directed && e.sourceNodeId === v && e.targetNodeId === u)
            );
            if (edge) edgesToHighlight.add(edge.id);
          }
          if ((res as DijkstraResult).reachable && dijkstraPath.length > 0) {
            const pathRiskRes = await analysisService.risk(networkId, dijkstraPath);
            setNetworkRisk(pathRiskRes);
          }
          break;
        case 'COMPARE':
          res = await analysisService.compare(networkId, sourceId, targetId);
          const comparePath = (res as ComparisonResult).dijkstra.path;
          setHighlightedNodeIds(new Set(comparePath));
          for (let i = 0; i < comparePath.length - 1; i++) {
            const u = comparePath[i];
            const v = comparePath[i + 1];
            const edge = network.edges.find(e =>
              (e.sourceNodeId === u && e.targetNodeId === v) ||
              (!e.directed && e.sourceNodeId === v && e.targetNodeId === u)
            );
            if (edge) edgesToHighlight.add(edge.id);
          }
          break;
        default:
          return;
      }
      setHighlightedEdgeIds(edgesToHighlight);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setRunError(msg);
    } finally {
      setRunning(false);
    }
  }

  function clearResult() {
    setResult(null);
    setRunError('');
    setHighlightedNodeIds(new Set());
    setHighlightedEdgeIds(new Set());
  }

  async function runSimulation() {
    if (!networkId || !simEntryNodeId) return;
    setRunning(true);
    setRunError('');
    setSimResult(null);
    try {
      const res = await simulationService.runAttack({
        networkId,
        entryNodeId: simEntryNodeId,
        targetNodeId: simTargetNodeId || undefined,
        maxDepth: simMaxDepth,
        blockedNodeIds: simBlockedNodes,
        blockedEdgeIds: []
      });
      setSimResult(res);
    } catch (err: any) {
      setRunError(err.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }

  function clearSimulation() {
    setSimResult(null);
    setRunError('');
  }

  async function handleDownloadReport() {
    if (!networkId) return;
    try {
      setDownloading(true);
      await analysisService.downloadReport(networkId, sourceId, targetId, algorithm);
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-text-dim)' }} className="pulse-copper">
          LOADING…
        </div>
      </div>
    );
  }

  if (!network) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: 'var(--cg-threat)', fontSize: 13 }}>Network not found</div>
        <button className="cg-btn cg-btn-ghost" onClick={() => navigate('/')}>← Back</button>
      </div>
    );
  }

  const needsTarget = algorithm === 'DIJKSTRA' || algorithm === 'COMPARE';
  const canRun = sourceId && (!needsTarget || targetId);

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
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cg-btn cg-btn-ghost cg-btn-sm" onClick={() => navigate(`/builder/${networkId}`)}>← Builder</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cg-text)' }}>
            Analysis · {network.name}
          </span>
        </div>

        <button
          className="cg-btn cg-btn-ghost cg-btn-sm"
          onClick={handleDownloadReport}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : '↓ Generate Report'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Control panel */}
        <div style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--cg-surface)',
          borderRight: '1px solid var(--cg-border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          height: 'calc(100vh - 44px)',
        }}>
          <div style={{ padding: '14px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`cg-btn ${mode === 'ANALYSIS' ? 'cg-btn-primary' : 'cg-btn-ghost'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                onClick={() => setMode('ANALYSIS')}
              >
                ANALYSIS
              </button>
              <button
                className={`cg-btn ${mode === 'SIMULATION' ? 'cg-btn-primary' : 'cg-btn-ghost'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                onClick={() => setMode('SIMULATION')}
              >
                SIMULATION
              </button>
            </div>

            {mode === 'ANALYSIS' && (
              <>
                <div className="cg-label" style={{ marginBottom: 10 }}>Algorithm</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                  {(['BFS', 'DFS', 'DIJKSTRA', 'COMPARE'] as Algorithm[]).map(a => (
                    <button
                      key={a}
                      className={`cg-btn ${algorithm === a ? 'cg-btn-primary' : 'cg-btn-ghost'}`}
                      style={{ justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                      onClick={() => { setAlgorithm(a); clearResult(); }}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                <div className="field-group">
                  <label className="cg-label">Entry Point / Source *</label>
                  <select
                    className="cg-input cg-select"
                    value={sourceId}
                    onChange={e => { setSourceId(e.target.value); clearResult(); }}
                  >
                    <option value="">Select node…</option>
                    {network.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                    ))}
                  </select>
                </div>

                {needsTarget && (
                  <div className="field-group">
                    <label className="cg-label">Target *</label>
                    <select
                      className="cg-input cg-select"
                      value={targetId}
                      onChange={e => { setTargetId(e.target.value); clearResult(); }}
                    >
                      <option value="">Select node…</option>
                      {network.nodes.filter(n => n.id !== sourceId).map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  className="cg-btn cg-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                  onClick={runAnalysis}
                  disabled={!canRun || running || network.nodes.length === 0}
                >
                  {running ? '◈ RUNNING…' : '▶ RUN ANALYSIS'}
                </button>
              </>
            )}

            {mode === 'SIMULATION' && (
              <>
                <div className="field-group">
                  <label className="cg-label">Entry Node *</label>
                  <select
                    className="cg-input cg-select"
                    value={simEntryNodeId}
                    onChange={e => { setSimEntryNodeId(e.target.value); clearSimulation(); }}
                  >
                    <option value="">Select node…</option>
                    {network.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="cg-label">Target Node (Optional)</label>
                  <select
                    className="cg-input cg-select"
                    value={simTargetNodeId}
                    onChange={e => { setSimTargetNodeId(e.target.value); clearSimulation(); }}
                  >
                    <option value="">None</option>
                    {network.nodes.filter(n => n.id !== simEntryNodeId).map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="cg-label">Max Depth: {simMaxDepth}</label>
                  <input
                    type="range"
                    min="1" max="20"
                    value={simMaxDepth}
                    onChange={e => { setSimMaxDepth(Number(e.target.value)); clearSimulation(); }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="field-group">
                  <label className="cg-label">Blocked Nodes</label>
                  <select
                    multiple
                    className="cg-input cg-select"
                    value={simBlockedNodes}
                    onChange={e => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      setSimBlockedNodes(values);
                      clearSimulation();
                    }}
                    style={{ height: 60 }}
                  >
                    {network.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="cg-btn cg-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 8 }}
                  onClick={runSimulation}
                  disabled={!simEntryNodeId || running}
                >
                  {running ? '◈ SIMULATING…' : '▶ RUN SIMULATION'}
                </button>
                {simResult && (
                  <button
                    className="cg-btn cg-btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                    onClick={clearSimulation}
                  >
                    CLEAR SIMULATION
                  </button>
                )}
              </>
            )}

            {network.nodes.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--cg-text-dim)', marginTop: 8, textAlign: 'center' }}>
                Add nodes to the network first.
              </div>
            )}
          </div>

          {/* Result panel */}
          <div style={{ flexShrink: 0, padding: '0 16px 16px 16px' }}>
            {runError && (
              <div style={{ background: 'rgba(201,74,69,0.1)', border: '1px solid var(--cg-threat-dim)', borderRadius: 4, padding: '8px 12px', fontSize: 12, color: 'var(--cg-threat)', marginBottom: 12 }}>
                {runError}
              </div>
            )}

            {!result && !runError && mode === 'ANALYSIS' && (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 24, opacity: 0.2 }}>⌬</div>
                <div className="empty-state-title">Run an analysis to view results.</div>
              </div>
            )}

            {result && algorithm !== 'COMPARE' && (() => {
              const r = result as BFSResult | DFSResult | DijkstraResult;
              const names = r.nodeNames;
              return (
                <div className="fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-copper)', textTransform: 'uppercase' }}>
                      {r.algorithm}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)' }}>
                      {r.runtimeMs}ms (measured)
                    </span>
                  </div>

                  <ComplexityTag time={r.theoreticalComplexity.time} space={r.theoreticalComplexity.space} />
                  <div className="section-divider" />

                  {r.algorithm === 'DIJKSTRA' && (
                    <>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                          Reachable
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.reachable ? 'var(--cg-healthy)' : 'var(--cg-threat)', fontWeight: 600 }}>
                          {r.reachable ? 'YES' : 'NO'}
                        </span>
                      </div>

                      {r.reachable ? (
                        <>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                              Path
                            </div>
                            <PathDisplay path={r.path} names={names} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 2 }}>Total Cost</div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--cg-copper-light)', fontWeight: 600 }}>{r.totalCost}</span>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 2 }}>Hops</div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--cg-copper-light)', fontWeight: 600 }}>{r.path.length - 1}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--cg-text-dim)', fontStyle: 'italic', marginBottom: 10 }}>
                          No path exists between the selected nodes under the current topology.
                        </div>
                      )}
                    </>
                  )}

                  {(r.algorithm === 'BFS' || r.algorithm === 'DFS') && (
                    <div style={{ marginBottom: 10 }}>
                      <TraversalList ids={r.traversalOrder} names={names} label="Traversal Order" />
                    </div>
                  )}

                  <div className="section-divider" />
                  <TraversalList ids={r.visitedNodes} names={names} label="Visited Nodes" />
                </div>
              );
            })()}

            {result && algorithm === 'COMPARE' && (() => {
              const r = result as ComparisonResult;
              const names = r.nodeNames;
              const rows = [
                { label: 'BFS', alg: r.bfs, path: r.bfs.traversalOrder, cost: 'N/A' },
                { label: 'DFS', alg: r.dfs, path: r.dfs.traversalOrder, cost: 'N/A' },
                { label: 'Dijkstra', alg: r.dijkstra, path: r.dijkstra.path, cost: r.dijkstra.reachable ? String(r.dijkstra.totalCost) : '∞' },
              ];
              return (
                <div className="fade-in" style={{ marginTop: 8 }}>
                  <CollapsibleSection title="Algorithm Comparison" defaultOpen={true} forceOpen={true}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {rows.map(({ label, alg, path, cost }) => (
                        <div key={label} style={{
                          background: 'var(--cg-surface)',
                          border: '1px solid var(--cg-border)',
                          borderRadius: 4,
                          padding: '10px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-copper-light)', fontWeight: 600 }}>{label}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)' }}>{alg.runtimeMs}ms</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-muted)' }}>
                              Visited: <span style={{ color: 'var(--cg-text)' }}>{alg.visitedNodes.length}</span>
                            </span>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-muted)' }}>
                              Cost: <span style={{ color: 'var(--cg-text)' }}>{cost}</span>
                            </span>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <PathDisplay path={path.slice(0, 5)} names={names} />
                            {path.length > 5 && <span style={{ fontSize: 9, color: 'var(--cg-text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4, display: 'block' }}>+{path.length - 5} more nodes</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                </div>
              );
            })()}

            {mode === 'SIMULATION' && simResult && (
              <div className="fade-in">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-copper)', textTransform: 'uppercase', marginBottom: 12 }}>
                  SIMULATION RESULT
                </div>

                {simTargetNodeId && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                      Target
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-text)' }}>
                      {simResult.nodeNames[simTargetNodeId] || simTargetNodeId}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: simResult.targetReached ? 'var(--cg-threat)' : 'var(--cg-healthy)', fontWeight: 600, marginTop: 4 }}>
                      {simResult.targetReached ? 'TARGET REACHED' : 'TARGET NOT REACHED'}
                    </div>
                  </div>
                )}

                {simResult.attackPath.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                      Attack Path
                    </div>
                    <PathDisplay path={simResult.attackPath} names={simResult.nodeNames} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Depth</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{simResult.depth}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Path Cost</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{simResult.totalCost}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Compromised Nodes</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--cg-threat)' }}>{simResult.compromisedNodes.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>At-Risk Nodes</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#C49A3C' }}>{simResult.atRiskNodes.length}</div>
                  </div>
                </div>

                {simResult.attackRisk && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                      Simulated Attack Risk
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--cg-copper-light)', fontWeight: 600 }}>
                        {simResult.attackRisk.score} / 10
                      </span>
                    </div>
                  </div>
                )}

                {simResult.attackRisk?.highestRiskNode && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                      Highest Risk Node
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-text)' }}>
                      {simResult.nodeNames[simResult.attackRisk.highestRiskNode] || simResult.attackRisk.highestRiskNode}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Risk Analysis Section */}
          {networkRisk && (
            <CollapsibleSection title="Network Risk" defaultOpen={true}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--cg-copper-light)', fontWeight: 600 }}>
                  {networkRisk.network.score} / 10
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: networkRisk.network.level === 'CRITICAL' || networkRisk.network.level === 'HIGH' ? 'var(--cg-threat)' : 'var(--cg-copper-dim)' }}>
                  {networkRisk.network.level}
                </span>
              </div>

              {networkRisk.path && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                    Path Risk
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--cg-copper-light)', fontWeight: 600 }}>
                      {networkRisk.path.score} / 10
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-copper-dim)' }}>
                      {networkRisk.path.level}
                    </span>
                  </div>
                </div>
              )}

              {selectedNodeId ? (() => {
                const nodeRisk = networkRisk.nodes.find(n => n.nodeId === selectedNodeId);
                if (!nodeRisk) return null;
                return (
                  <div style={{ background: 'var(--cg-surface)', border: '1px solid var(--cg-border)', borderRadius: 4, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-copper-light)', fontWeight: 600, marginBottom: 8 }}>
                      Node: {networkRisk.nodeNames?.[selectedNodeId] || selectedNodeId}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cg-text)', marginBottom: 6 }}>
                      Risk Score: {nodeRisk.score}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)', marginBottom: 4 }}>Contributors:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-muted)' }}>
                      <span>Vulnerability</span><span>{nodeRisk.components.vulnerability}</span>
                      <span>Criticality</span><span>{nodeRisk.components.criticality}</span>
                      <span>Connectivity</span><span>{nodeRisk.components.connectivity}</span>
                      <span>Exposure</span><span>{nodeRisk.components.exposure}</span>
                    </div>
                  </div>
                );
              })() : (
                <>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 4 }}>
                    Critical Risk Nodes
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-muted)' }}>
                    {networkRisk.criticalRiskNodes.map(id => (
                      <li key={id}>{networkRisk.nodeNames?.[id] || id}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)', fontStyle: 'italic', marginTop: 12 }}>
                    Click a node for risk details.
                  </div>
                </>
              )}
            </CollapsibleSection>
          )}

          {/* Monitoring Status Section */}
          <CollapsibleSection title="Network Status" defaultOpen={false}>
            {(() => {
              let active = 0, degraded = 0, offline = 0;
              network.nodes.forEach(n => {
                const st = nodeStatuses[n.id] || 'ACTIVE';
                if (st === 'ACTIVE') active++;
                else if (st === 'DEGRADED') degraded++;
                else if (st === 'OFFLINE') offline++;
              });

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Nodes</div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--cg-text)' }}>{network.nodes.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Active</div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--cg-healthy)' }}>{active}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Degraded</div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#C49A3C' }}>{degraded}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cg-text-dim)' }}>Offline</div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#C94A45' }}>{offline}</div>
                  </div>
                </div>
              );
            })()}

            {monitoringEvents.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-dim)', marginBottom: 8 }}>
                  Event Stream
                </div>
                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monitoringEvents.map(ev => {
                    const nodeName = network.nodes.find(n => n.id === ev.entityId)?.name || ev.entityId;
                    return (
                      <div key={ev.id} style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                        <div style={{ color: 'var(--cg-text-muted)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</div>
                        <div style={{ color: 'var(--cg-text)', fontWeight: 600 }}>{nodeName}</div>
                        <div style={{ color: 'var(--cg-copper-dim)' }}>
                          {ev.previousStatus ? `${ev.previousStatus} → ` : ''}{ev.currentStatus}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Graph */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, height: '100%' }}>
          <ReactFlowProvider>
            <NetworkGraph
              networkId={networkId!}
              dbNodes={network.nodes}
              dbEdges={network.edges}
              highlightedNodeIds={mode === 'SIMULATION' ? undefined : highlightedNodeIds}
              highlightedEdgeIds={mode === 'SIMULATION' ? undefined : highlightedEdgeIds}
              nodeStatuses={nodeStatuses}
              simulationResult={mode === 'SIMULATION' && simResult ? simResult : undefined}
              onNodeSelect={setSelectedNodeId}
              readOnly={true}
            />
          </ReactFlowProvider>

          {/* Hint overlay — only shown before any analysis is run, never hides the graph (pointerEvents:none) */}
          {!result && !runError && mode === 'ANALYSIS' && network.nodes.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              textAlign: 'center',
              background: 'rgba(25, 23, 20, 0.82)',
              padding: '12px 24px',
              borderRadius: 6,
              border: '1px solid rgba(145, 136, 126, 0.12)',
              backdropFilter: 'blur(4px)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-copper-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Select an algorithm and run analysis</div>
              <div style={{ fontSize: 11, color: 'var(--cg-text-dim)' }}>to highlight the intrusion path</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
