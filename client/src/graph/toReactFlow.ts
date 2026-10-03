// Converts application-level NetworkNode/NetworkEdge to React Flow nodes/edges
// React Flow is ONLY used as the rendering/interaction layer.
// The actual graph data comes from the database.

import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import type { NetworkNode, NetworkEdge, SimulationResult } from '../types';

const CRITICALITY_BORDER: Record<string, string> = {
  CRITICAL: '#C94A45',
  HIGH: '#C49A3C',
  MEDIUM: '#B66A3C',
  LOW: '#71856A',
};

const NODE_TYPE_ICON: Record<string, string> = {
  INTERNET: '🌐',
  ROUTER: '⬡',
  FIREWALL: '🛡',
  SERVER: '◈',
  DATABASE: '⬟',
  WORKSTATION: '⬜',
  IOT: '◉',
  CLOUD: '☁',
  ENDPOINT: '◆',
};

export function toRFNodes(nodes: NetworkNode[], highlightedIds?: Set<string>, nodeStatuses?: Record<string, string>, sim?: SimulationResult): RFNode[] {
  return nodes.map((n, index) => {
    const isHighlighted = highlightedIds?.has(n.id) ?? false;
    const currentStatus = nodeStatuses?.[n.id] ?? n.status ?? 'ACTIVE';

    let simState = 'NORMAL';
    if (sim) {
      if (sim.compromisedNodes.includes(n.id)) simState = 'COMPROMISED';
      else if (sim.atRiskNodes.includes(n.id)) simState = 'AT_RISK';
      else if (sim.blockedNodes.includes(n.id)) simState = 'BLOCKED';
    }
    
    // Deterministic grid layout fallback
    const fallbackX = (index % 3) * 300;
    const fallbackY = Math.floor(index / 3) * 200;

    return {
      id: n.id,
      type: 'cyberNode',
      position: {
        x: n.positionX ?? fallbackX,
        y: n.positionY ?? fallbackY,
      },
      data: {
        label: n.name,
        nodeType: n.type,
        criticality: n.criticality,
        vulnerabilityScore: n.vulnerabilityScore,
        icon: NODE_TYPE_ICON[n.type] ?? '◦',
        criticalityColor: CRITICALITY_BORDER[n.criticality] ?? '#71856A',
        isHighlighted,
        status: currentStatus,
        simState,
      },
    };
  });
}

export function toRFEdges(edges: NetworkEdge[], highlightedIds?: Set<string>): RFEdge[] {
  return edges.map((e) => {
    const isHighlighted = highlightedIds?.has(e.id) ?? false;
    const isIsolated = e.status === 'ISOLATED';
    return {
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'cyberEdge',
      animated: isHighlighted,
      markerEnd: e.directed ? { type: 'arrowclosed' as const, color: isHighlighted ? '#D18A57' : '#3D3530' } : undefined,
      style: {
        stroke: isHighlighted ? '#D18A57' : isIsolated ? '#3D3530' : '#4A4040',
        strokeWidth: isHighlighted ? 2 : 1,
        strokeDasharray: isIsolated ? '5,4' : undefined,
        opacity: isIsolated ? 0.4 : 1,
      },
      data: {
        cost: e.cost,
        risk: e.risk,
        status: e.status,
        directed: e.directed,
        isHighlighted,
      },
      label: `cost:${e.cost}`,
      labelStyle: {
        fontSize: 9,
        fontFamily: "'IBM Plex Mono', monospace",
        fill: '#5E5650',
      },
      labelBgStyle: {
        fill: '#191714',
        fillOpacity: 0.8,
      },
    };
  });
}
