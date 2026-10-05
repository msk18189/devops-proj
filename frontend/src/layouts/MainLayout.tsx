import { ReactNode } from 'react';
import { Navbar } from '../components/Navbar.tsx';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function MainLayout({ children, currentView, onNavigate }: MainLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentView={currentView} onNavigate={onNavigate} />

      <main className="container" style={{ flex: 1 }}>
        {children}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '2rem 0',
        marginTop: 'auto',
        color: 'var(--text-subtle)',
        fontSize: '0.85rem',
        textAlign: 'center'
      }}>
        <div className="container">
          <p>© 2026 StreamOps — DevOps for Video Streaming Platform. High Availability & Observability.</p>
        </div>
      </footer>
    </div>
  );
}
