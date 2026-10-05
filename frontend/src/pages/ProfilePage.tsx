import { useAuth } from '../hooks/useAuth.tsx';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Account Profile</h1>

      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'white'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>User ID</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>#{user.id}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Assigned Role</span>
            <span className={`badge ${user.role === 'ADMIN' ? 'badge-emerald' : 'badge-indigo'}`}>{user.role}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Authorization Method</span>
            <span>Signed JWT (HMAC-SHA256)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
