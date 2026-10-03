import { useState } from 'react';
import type { NetworkNode } from '../types';

const NODE_TYPES = ['INTERNET', 'ROUTER', 'FIREWALL', 'SERVER', 'DATABASE', 'WORKSTATION', 'IOT', 'CLOUD', 'ENDPOINT'];
const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface NodeFormData {
  name: string;
  type: string;
  criticality: string;
  vulnerabilityScore: string;
}

interface NodeFormErrors {
  name?: string;
  type?: string;
  criticality?: string;
  vulnerabilityScore?: string;
}

interface NodeFormProps {
  initial?: Partial<NetworkNode>;
  onSubmit: (data: { name: string; type: string; criticality: string; vulnerabilityScore: number }) => Promise<void>;
  onCancel: () => void;
  title: string;
}

export function NodeForm({ initial, onSubmit, onCancel, title }: NodeFormProps) {
  const [form, setForm] = useState<NodeFormData>({
    name: initial?.name ?? '',
    type: initial?.type ?? '',
    criticality: initial?.criticality ?? '',
    vulnerabilityScore: initial?.vulnerabilityScore?.toString() ?? '',
  });
  const [errors, setErrors] = useState<NodeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate(): boolean {
    const e: NodeFormErrors = {};
    if (!form.name.trim()) e.name = 'Node name is required';
    if (!form.type) e.type = 'Node type is required';
    if (!form.criticality) e.criticality = 'Criticality is required';
    const vs = Number(form.vulnerabilityScore);
    if (form.vulnerabilityScore === '' || isNaN(vs) || vs < 0 || vs > 10) {
      e.vulnerabilityScore = 'Must be a number between 0 and 10';
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
        name: form.name.trim(),
        type: form.type,
        criticality: form.criticality,
        vulnerabilityScore: Number(form.vulnerabilityScore),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save node';
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
              <label className="cg-label">Node Name *</label>
              <input
                className={`cg-input ${errors.name ? 'border-red-500' : ''}`}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Web Server 01"
                autoFocus
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="field-group">
              <label className="cg-label">Node Type *</label>
              <select
                className="cg-input cg-select"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="">Select type…</option>
                {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <span className="field-error">{errors.type}</span>}
            </div>

            <div className="field-group">
              <label className="cg-label">Criticality *</label>
              <select
                className="cg-input cg-select"
                value={form.criticality}
                onChange={e => setForm(f => ({ ...f, criticality: e.target.value }))}
              >
                <option value="">Select criticality…</option>
                {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.criticality && <span className="field-error">{errors.criticality}</span>}
            </div>

            <div className="field-group">
              <label className="cg-label">Vulnerability Score * <span style={{ color: 'var(--cg-text-dim)', textTransform: 'none', fontWeight: 400 }}>(0 – 10)</span></label>
              <input
                className="cg-input"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={form.vulnerabilityScore}
                onChange={e => setForm(f => ({ ...f, vulnerabilityScore: e.target.value }))}
                placeholder="e.g. 7.5"
              />
              {errors.vulnerabilityScore && <span className="field-error">{errors.vulnerabilityScore}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cg-btn cg-btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="cg-btn cg-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
