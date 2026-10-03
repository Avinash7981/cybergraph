import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  type Connection,
  type OnNodeDrag,
} from '@xyflow/react';
import type { NetworkNode, NetworkEdge, SimulationResult } from '../types';
import { toRFNodes, toRFEdges } from './toReactFlow';
import { CyberNode } from './CyberNode';
import { nodeService } from '../services/api';

interface NetworkGraphProps {
  networkId: string;
  dbNodes: NetworkNode[];
  dbEdges: NetworkEdge[];
  highlightedNodeIds?: Set<string>;
  highlightedEdgeIds?: Set<string>;
  nodeStatuses?: Record<string, string>;
  simulationResult?: SimulationResult;
  onNodeSelect?: (nodeId: string | null) => void;
  onRequestAddEdge?: (sourceId: string, targetId: string) => void;
  onPositionChange?: (nodeId: string, x: number, y: number) => void;
  readOnly?: boolean;
}

const nodeTypes = { cyberNode: CyberNode };

// Inner component must live inside ReactFlowProvider to use useReactFlow()
function NetworkGraphInner({
  networkId,
  dbNodes,
  dbEdges,
  highlightedNodeIds,
  highlightedEdgeIds,
  nodeStatuses,
  simulationResult,
  onNodeSelect,
  onRequestAddEdge,
  onPositionChange,
  readOnly = false,
}: NetworkGraphProps) {
  const { fitView } = useReactFlow();

  const rfNodes = useMemo(
    () => toRFNodes(dbNodes, highlightedNodeIds, nodeStatuses, simulationResult),
    [dbNodes, highlightedNodeIds, nodeStatuses, simulationResult]
  );

  const rfEdges = useMemo(
    () => toRFEdges(dbEdges, highlightedEdgeIds),
    [dbEdges, highlightedEdgeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync nodes/edges from props into React Flow state
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  // Fit view when nodes or highlights change
  useEffect(() => {
    if (rfNodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [rfNodes.length, highlightedNodeIds, fitView]);

  // Dev debug log (requirement #14)
  console.log('[NetworkGraph]', {
    dbNodesCount: dbNodes.length,
    dbEdgesCount: dbEdges.length,
    highlightedNodeIds: highlightedNodeIds ? [...highlightedNodeIds] : [],
    highlightedEdgeIds: highlightedEdgeIds ? [...highlightedEdgeIds] : [],
    nodesRendered: nodes.length,
    edgesRendered: edges.length,
  });

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!readOnly && connection.source && connection.target) {
        onRequestAddEdge?.(connection.source, connection.target);
      }
    },
    [readOnly, onRequestAddEdge]
  );

  const onNodeDragStop = useCallback<OnNodeDrag>(
    (_event, node) => {
      if (!readOnly) {
        onPositionChange?.(node.id, node.position.x, node.position.y);
        nodeService.update(networkId, node.id, {
          positionX: node.position.x,
          positionY: node.position.y,
        }).catch((err) => {
          console.error('Failed to save position:', err);
          alert('Failed to save node position.');
        });
      }
    },
    [networkId, readOnly, onPositionChange]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={true}
      colorMode="dark"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#302A24"
      />
      <Controls
        style={{ background: '#191714', border: '1px solid #302A24' }}
      />
      <MiniMap
        nodeColor={(n) => {
          const data = n.data as { criticalityColor?: string };
          return data?.criticalityColor ?? '#302A24';
        }}
        maskColor="rgba(17, 16, 14, 0.8)"
        style={{ background: '#191714', border: '1px solid #302A24' }}
      />
    </ReactFlow>
  );
}

export function NetworkGraph(props: NetworkGraphProps) {
  const { dbNodes, readOnly } = props;

  // In non-readOnly mode with no nodes, show an empty state placeholder
  if (dbNodes.length === 0 && !readOnly) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#11100E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <svg style={{ position: 'absolute', opacity: 0.03, pointerEvents: 'none' }}>
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#91887E" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{ fontSize: 32, opacity: 0.2 }}>◈</div>
        <div className="empty-state-title">Your network has no nodes yet.</div>
        <div className="empty-state-sub">Add nodes using the panel on the left to begin.</div>
      </div>
    );
  }

  // In readOnly mode with no nodes, show a minimal placeholder (no ReactFlow)
  if (dbNodes.length === 0 && readOnly) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#11100E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.2 }}>⌬</div>
        <div
          className="empty-state-title"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-copper-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          NETWORK VISUALIZATION
        </div>
        <div className="empty-state-sub" style={{ color: 'var(--cg-text)', fontSize: 13 }}>
          Add nodes to begin
        </div>
      </div>
    );
  }

  // Nodes exist — always render the ReactFlow graph (both Builder and Analysis)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        position: 'relative',
      }}
    >
      <NetworkGraphInner {...props} />
    </div>
  );
}
