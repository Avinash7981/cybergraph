import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authService.register({ name, email, password });
      setUser(user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cg-bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: 340, padding: 32, background: 'var(--cg-surface)', border: '1px solid var(--cg-border)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--cg-copper-light)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            CYBERGRAPH
          </div>
          <div style={{ fontSize: 12, color: 'var(--cg-text-dim)' }}>Create an account</div>
        </div>

        {error && (
          <div style={{ padding: 12, marginBottom: 16, background: 'rgba(201,74,69,0.1)', border: '1px solid var(--cg-threat-dim)', borderRadius: 4, fontSize: 12, color: 'var(--cg-threat)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="cg-label">Name</label>
            <input
              type="text"
              className="cg-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label className="cg-label">Email</label>
            <input
              type="email"
              className="cg-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label className="cg-label">Password</label>
            <input
              type="password"
              className="cg-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="cg-btn cg-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'REGISTERING...' : 'REGISTER'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--cg-text-dim)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--cg-copper)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
