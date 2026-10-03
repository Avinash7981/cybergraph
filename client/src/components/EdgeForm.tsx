import { useState } from 'react';
import type { NetworkNode, NetworkEdge } from '../types';

interface EdgeFormData {
  sourceNodeId: string;
  targetNodeId: string;
  cost: string;
  risk: string;
  directed: boolean;
  status: string;
}

interface EdgeFormErrors {
  sourceNodeId?: string;
  targetNodeId?: string;
  cost?: string;
  risk?: string;
}

interface EdgeFormProps {
  nodes: NetworkNode[];
  initial?: Partial<NetworkEdge>;
  preselectedSource?: string;
  preselectedTarget?: string;
  onSubmit: (data: {
    sourceNodeId: string;
    targetNodeId: string;
    cost: number;
    risk: number;
    directed: boolean;
    status: string;
  }) => Promise<void>;
  onCancel: () => void;
  title: string;
}

export function EdgeForm({ nodes, initial, preselectedSource, preselectedTarget, onSubmit, onCancel, title }: EdgeFormProps) {
  const [form, setForm] = useState<EdgeFormData>({
    sourceNodeId: preselectedSource ?? initial?.sourceNodeId ?? '',
    targetNodeId: preselectedTarget ?? initial?.targetNodeId ?? '',
    cost: initial?.cost?.toString() ?? '',
    risk: initial?.risk?.toString() ?? '',
    directed: initial?.directed ?? false,
    status: initial?.status ?? 'ACTIVE',
  });
  const [errors, setErrors] = useState<EdgeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate(): boolean {
    const e: EdgeFormErrors = {};
    if (!form.sourceNodeId) e.sourceNodeId = 'Source node is required';
    if (!form.targetNodeId) e.targetNodeId = 'Target node is required';
    if (form.sourceNodeId && form.targetNodeId && form.sourceNodeId === form.targetNodeId) {
      e.targetNodeId = 'Source and target cannot be the same node';
    }
    const cost = Number(form.cost);
    if (form.cost === '' || isNaN(cost) || cost <= 0) {
      e.cost = 'Cost must be a positive number';
    }
    const risk = Number(form.risk);
    if (form.risk === '' || isNaN(risk) || risk < 0 || risk > 10) {
      e.risk = 'Risk must be between 0 and 10';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        sourceNodeId: form.sourceNodeId,
        targetNodeId: form.targetNodeId,
        cost: Number(form.cost),
        risk: Number(form.risk),
        directed: form.directed,
        status: form.status,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save connection';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box fade-in">
        <div className="modal-header">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-muted)' }}>
            {title}
          </span>
          <button className="cg-btn cg-btn-ghost cg-btn-sm" onClick={onCancel} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {serverError && (
              <div style={{ background: 'rgba(201,74,69,0.1)', border: '1px solid var(--cg-threat-dim)', borderRadius: 4, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--cg-threat)' }}>
                {serverError}
              </div>
            )}

            <div className="field-group">
              <label className="cg-label">Source Node *</label>
              <select
                className="cg-input cg-select"
                value={form.sourceNodeId}
                onChange={e => setForm(f => ({ ...f, sourceNodeId: e.target.value }))}
              >
                <option value="">Select source node…</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}
              </select>
              {errors.sourceNodeId && <span className="field-error">{errors.sourceNodeId}</span>}
            </div>

            <div className="field-group">
              <label className="cg-label">Target Node *</label>
              <select
                className="cg-input cg-select"
                value={form.targetNodeId}
                onChange={e => setForm(f => ({ ...f, targetNodeId: e.target.value }))}
              >
                <option value="">Select target node…</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}
              </select>
              {errors.targetNodeId && <span className="field-error">{errors.targetNodeId}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field-group">
                <label className="cg-label">Cost * <span style={{ color: 'var(--cg-text-dim)', textTransform: 'none' }}>(positive)</span></label>
                <input
                  className="cg-input"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="e.g. 5"
                />
                {errors.cost && <span className="field-error">{errors.cost}</span>}
              </div>

              <div className="field-group">
                <label className="cg-label">Risk * <span style={{ color: 'var(--cg-text-dim)', textTransform: 'none' }}>(0–10)</span></label>
                <input
                  className="cg-input"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={form.risk}
                  onChange={e => setForm(f => ({ ...f, risk: e.target.value }))}
                  placeholder="e.g. 6.5"
                />
                {errors.risk && <span className="field-error">{errors.risk}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field-group">
                <label className="cg-label">Direction</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--cg-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={form.directed}
                    onChange={e => setForm(f => ({ ...f, directed: e.target.checked }))}
                    style={{ accentColor: 'var(--cg-copper)' }}
                  />
                  Directed
                </label>
              </div>

              <div className="field-group">
                <label className="cg-label">Status</label>
                <select
                  className="cg-input cg-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ISOLATED">ISOLATED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cg-btn cg-btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="cg-btn cg-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
