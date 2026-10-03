import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { BuilderPage } from './pages/BuilderPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authService } from './services/api';

// Sidebar navigation
function Sidebar() {
  return (
    <div style={{
      width: 52,
      background: 'var(--cg-surface)',
      borderRight: '1px solid var(--cg-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
      flexShrink: 0,
    }}>
      {/* Logo mark */}
      <div style={{
        width: 32,
        height: 32,
        background: 'var(--cg-copper)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        color: '#0F0D0B',
        letterSpacing: '-0.04em',
      }}>
        CG
      </div>

      <a
        href="/"
        title="Dashboard"
        style={{
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          color: 'var(--cg-text-dim)',
          textDecoration: 'none',
          fontSize: 16,
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cg-surface-2)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cg-text)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cg-text-dim)';
        }}
      >
        ⊞
      </a>

      <button
        title="Logout"
        onClick={() => {
          authService.logout().then(() => window.location.href = '/login');
        }}
        style={{
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          color: 'var(--cg-text-dim)',
          textDecoration: 'none',
          fontSize: 16,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          marginTop: 'auto',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cg-surface-2)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cg-threat)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cg-text-dim)';
        }}
      >
        ⎋
      </button>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cg-text-dim)' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="*" element={
              <ProtectedRoute>
                <Sidebar />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/builder/:networkId" element={<BuilderPage />} />
                    <Route path="/analysis/:networkId" element={<AnalysisPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
