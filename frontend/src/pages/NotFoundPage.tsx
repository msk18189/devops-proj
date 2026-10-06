interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateBrowse: () => void;
}

export function NotFoundPage({ onNavigateHome, onNavigateBrowse }: NotFoundPageProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '6rem 1.5rem',
      maxWidth: '540px',
      margin: '0 auto'
    }}>
      <div style={{
        fontSize: '6rem',
        fontWeight: 900,
        letterSpacing: '-0.05em',
        lineHeight: 1,
        color: 'var(--text-subtle)',
        marginBottom: '1rem',
        fontFamily: 'var(--font-mono)'
      }}>
        404
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#FFFFFF' }}>
        Page Not Found
      </h1>

      <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
        The stream or resource you were looking for doesn't exist, was moved, or has been removed from storage.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onNavigateHome} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
          Back to Home
        </button>
        <button onClick={onNavigateBrowse} className="btn btn-secondary" style={{ padding: '0.65rem 1.4rem' }}>
          Browse Catalog
        </button>
      </div>
    </div>
  );
}
