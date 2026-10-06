import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { videoService } from '../services/videoService.ts';

interface ProfilePageProps {
  onNavigateMyVideos?: () => void;
  onNavigateUpload?: () => void;
}

export function ProfilePage({ onNavigateMyVideos, onNavigateUpload }: ProfilePageProps) {
  const { user } = useAuth();
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [totalViews, setTotalViews] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    videoService.getVideos({ userId: user.id, pageSize: 100 })
      .then(res => {
        setVideoCount(res.total);
        const views = res.items.reduce((acc, curr) => acc + curr.views, 0);
        setTotalViews(views);
      })
      .catch(err => {
        console.error('Failed to load user video counts for profile:', err);
      });
  }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Authentication Required</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please log in to view your user profile and account details.</p>
      </div>
    );
  }

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Active Account';

  return (
    <div style={{ padding: '2.5rem 0', maxWidth: '680px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
        User Account Profile
      </h1>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '2rem'
      }}>
        {/* User Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-elevated)',
            border: '2px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#FFFFFF'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{user.name}</h2>
              <span className={`badge ${user.role === 'ADMIN' ? 'badge-emerald' : 'badge-indigo'}`}>
                {user.role}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>{user.email}</p>
          </div>
        </div>

        {/* Creator Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Videos Uploaded</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem' }}>
              {videoCount !== null ? videoCount : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Views Received</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', marginTop: '0.25rem' }}>
              {totalViews !== null ? totalViews.toLocaleString() : '—'}
            </div>
          </div>
        </div>

        {/* Account Metadata List */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Account ID</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#FFFFFF' }}>#{user.id}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email Address</span>
            <span style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{user.email}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Account Role</span>
            <span style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{user.role}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Account Creation Date</span>
            <span style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{formattedDate}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Security Protocol</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>HMAC-SHA256 Signed JWT</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        {onNavigateMyVideos && (
          <button onClick={onNavigateMyVideos} className="btn btn-secondary">
            View My Videos
          </button>
        )}
        {onNavigateUpload && (
          <button onClick={onNavigateUpload} className="btn btn-primary">
            Upload Video
          </button>
        )}
      </div>
    </div>
  );
}
