import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { HealthBadge } from './HealthBadge.tsx';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export function Navbar({ currentView, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleNavClick = (view: string, param?: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(view, param);
  };

  return (
    <header className="nav-header">
      <div className="container nav-wrapper">
        <div className="nav-left">
          <button
            onClick={() => handleNavClick('home')}
            className="nav-brand"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="brand-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <span>StreamOps</span>
          </button>

          <HealthBadge />

          <nav className="nav-menu" style={{ display: 'flex' }}>
            <button
              onClick={() => handleNavClick('home')}
              className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('browse')}
              className={`nav-item ${currentView === 'browse' ? 'active' : ''}`}
            >
              Browse
            </button>
            <button
              onClick={() => handleNavClick('search')}
              className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
            >
              Search
            </button>
            {user && (
              <button
                onClick={() => handleNavClick('my-videos')}
                className={`nav-item ${currentView === 'my-videos' ? 'active' : ''}`}
              >
                My Videos
              </button>
            )}
            {user && user.role === 'ADMIN' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
                style={{ color: '#F59E0B', fontWeight: 600 }}
              >
                Admin
              </button>
            )}
          </nav>
        </div>

        <div className="nav-right">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => handleNavClick('upload')}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.95rem' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload
              </button>

              <button
                onClick={() => handleNavClick('profile')}
                className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#FFFFFF'
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name.split(' ')[0]}</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  handleNavClick('home');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => handleNavClick('login')}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.95rem' }}
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavClick('register')}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.95rem' }}
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-secondary mobile-menu-toggle"
            style={{ padding: '0.4rem 0.6rem', display: 'none' }}
            aria-label="Toggle Navigation Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <button onClick={() => handleNavClick('home')} className={`nav-item ${currentView === 'home' ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.5rem' }}>Home</button>
          <button onClick={() => handleNavClick('browse')} className={`nav-item ${currentView === 'browse' ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.5rem' }}>Browse</button>
          <button onClick={() => handleNavClick('search')} className={`nav-item ${currentView === 'search' ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.5rem' }}>Search</button>
          {user && (
            <button onClick={() => handleNavClick('my-videos')} className={`nav-item ${currentView === 'my-videos' ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.5rem' }}>My Videos</button>
          )}
          {user && user.role === 'ADMIN' && (
            <button onClick={() => handleNavClick('admin')} className={`nav-item ${currentView === 'admin' ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.5rem', color: '#F59E0B' }}>Admin Dashboard</button>
          )}
          {user && (
            <button onClick={() => handleNavClick('upload')} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Upload Video</button>
          )}
        </div>
      )}
    </header>
  );
}
