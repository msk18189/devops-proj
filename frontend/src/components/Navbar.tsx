import { useAuth } from '../hooks/useAuth.tsx';
import { HealthBadge } from './HealthBadge.tsx';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Navbar({ currentView, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container nav-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button
            onClick={() => onNavigate('home')}
            className="brand"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <span>StreamOps</span>
          </button>
          <HealthBadge />
        </div>

        <nav className="nav-links">
          <button
            onClick={() => onNavigate('home')}
            className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none' }}
          >
            Explore
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => onNavigate('profile')}
                className={`nav-link ${currentView === 'profile' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none' }}
              >
                Profile ({user.name.split(' ')[0]})
              </button>
              {user.role === 'ADMIN' && (
                <span className="badge badge-emerald">Admin</span>
              )}
              <button
                onClick={() => {
                  logout();
                  onNavigate('home');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => onNavigate('login')}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1rem' }}
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem' }}
              >
                Get Started
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
