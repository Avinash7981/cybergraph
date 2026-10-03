import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Network } from '../types/index';
import { networkService } from '../services/api';

interface NewNetworkForm {
  name: string;
  description: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewNetworkForm>({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadNetworks() {
    try {
      setLoading(true);
      const data = await networkService.list();
      setNetworks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNetworks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Network name is required');
      return;
    }
    setCreating(true);
    try {
      const created = await networkService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      navigate(`/builder/${created.id}`);
    } catch {
      setFormError('Failed to create network');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete network "${name}" and all its data?`)) return;
    try {
      await networkService.delete(id);
      await loadNetworks();
    } catch {
      alert('Failed to delete network');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // reset input
    e.target.value = '';
    
    try {
      setLoading(true);
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await networkService.importJSON(payload);
      navigate(`/builder/${res.network.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to import JSON');
    } finally {
      await loadNetworks();
    }
  }

  const totalNodes = networks.reduce((s, n) => s + (n._count?.nodes ?? 0), 0);
  const totalEdges = networks.reduce((s, n) => s + (n._count?.edges ?? 0), 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--cg-text)', marginBottom: 4 }}>
            CYBERGRAPH
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Network Intrusion Path Analysis
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="cg-btn cg-btn-ghost" style={{ cursor: 'pointer' }}>
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            ↓ Import JSON
          </label>
          <button
            className="cg-btn cg-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + New Network
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Networks</div>
          <div className="stat-value">{loading ? '—' : networks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value">{loading ? '—' : totalNodes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Edges</div>
          <div className="stat-value">{loading ? '—' : totalEdges}</div>
        </div>
      </div>

      {/* Network list */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cg-text-dim)' }}>
          Networks
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--cg-border)' }} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--cg-text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '20px 0' }} className="pulse-copper">
          LOADING…
        </div>
      ) : networks.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: 40, opacity: 0.15 }}>◈</div>
          <div className="empty-state-title">No network loaded.</div>
          <div className="empty-state-sub">Create a network or import one to begin.</div>
          <button className="cg-btn cg-btn-primary" style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>
            + Create Network
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {networks.map(net => (
            <div
              key={net.id}
              style={{
                background: 'var(--cg-surface)',
                border: '1px solid var(--cg-border)',
                borderRadius: 6,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'border-color 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cg-border-2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--cg-border)')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cg-text)', marginBottom: 2 }}>
                  {net.name}
                </div>
                {net.description && (
                  <div style={{ fontSize: 12, color: 'var(--cg-text-dim)', marginBottom: 4 }}>{net.description}</div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cg-text-dim)' }}>
                  {net._count?.nodes ?? 0} nodes · {net._count?.edges ?? 0} edges ·
                  <span style={{ marginLeft: 4 }}>
                    {new Date(net.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="cg-btn cg-btn-ghost cg-btn-sm"
                  onClick={() => navigate(`/analysis/${net.id}`)}
                >
                  ⌬ Analyze
                </button>
                <button
                  className="cg-btn cg-btn-primary cg-btn-sm"
                  onClick={() => navigate(`/builder/${net.id}`)}
                >
                  Open →
                </button>
                <button
                  className="cg-btn cg-btn-danger cg-btn-sm"
                  onClick={() => handleDelete(net.id, net.name)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Network Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-box fade-in">
            <div className="modal-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cg-text-muted)' }}>
                New Network
              </span>
              <button className="cg-btn cg-btn-ghost cg-btn-sm" onClick={() => setShowCreate(false)} style={{ padding: '2px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(201,74,69,0.1)', border: '1px solid var(--cg-threat-dim)', borderRadius: 4, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--cg-threat)' }}>
                    {formError}
                  </div>
                )}
                <div className="field-group">
                  <label className="cg-label">Network Name *</label>
                  <input
                    className="cg-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Corporate LAN"
                    autoFocus
                  />
                </div>
                <div className="field-group">
                  <label className="cg-label">Description</label>
                  <input
                    className="cg-input"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cg-btn cg-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="cg-btn cg-btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Network'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
