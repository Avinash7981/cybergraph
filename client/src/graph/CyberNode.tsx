import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface CyberNodeData {
  label: string;
  nodeType: string;
  criticality: string;
  vulnerabilityScore: number;
  icon: string;
  criticalityColor: string;
  isHighlighted: boolean;
  status: string;
  simState?: string;
}

export const CyberNode = memo(({ data }: { data: CyberNodeData }) => {
  const isOffline = data.status === 'OFFLINE';
  const isDegraded = data.status === 'DEGRADED';
  
  let opacity = 1;
  let borderColor = data.isHighlighted ? data.criticalityColor : '#302A24';
  let boxShadow = data.isHighlighted ? `0 0 12px ${data.criticalityColor}40` : '0 2px 8px rgba(0,0,0,0.4)';
  
  if (data.simState === 'COMPROMISED') {
    borderColor = '#D18A57'; // burnt copper
    boxShadow = `0 0 16px rgba(209,138,87,0.5)`;
  } else if (data.simState === 'AT_RISK') {
    borderColor = '#C49A3C'; // warning outline
  } else if (data.simState === 'BLOCKED') {
    opacity = 0.4;
    borderColor = '#302A24';
  } else if (isOffline) {
    opacity = 0.5;
    borderColor = '#C94A45'; // threat color
  } else if (isDegraded) {
    borderColor = '#C49A3C'; // degraded color
  }

  return (
    <div
      style={{
        background: '#191714',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 6,
        padding: '8px 12px',
        minWidth: 110,
        maxWidth: 160,
        opacity,
        boxShadow,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: -1,
          left: 8,
          right: 8,
          height: 2,
          background: data.criticalityColor,
          borderRadius: '0 0 2px 2px',
          opacity: data.isHighlighted ? 1 : 0.5,
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#302A24', border: '1px solid #4A4040', width: 7, height: 7 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{data.icon}</span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: '#91887E',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {data.nodeType}
        </span>
        {isOffline && <span style={{ color: '#C94A45', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>OFF</span>}
        {isDegraded && <span style={{ color: '#C49A3C', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>DEG</span>}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: data.isHighlighted ? '#E8E1D8' : '#C8BFB4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 130,
        }}
      >
        {data.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
        <span
          style={{
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
            color: data.criticalityColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {data.criticality}
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
            color: '#5E5650',
          }}
        >
          v:{data.vulnerabilityScore.toFixed(1)}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#302A24', border: '1px solid #4A4040', width: 7, height: 7 }}
      />
    </div>
  );
});

CyberNode.displayName = 'CyberNode';
