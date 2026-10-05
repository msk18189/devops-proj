import { Video } from '../types/index.ts';
import { formatDuration, formatFileSize, formatDate } from '../utils/formatters.ts';

interface VideoDetailPageProps {
  video: Video;
  onBack: () => void;
}

export function VideoDetailPage({ video, onBack }: VideoDetailPageProps) {
  return (
    <div style={{ padding: '2rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Catalog
      </button>

      {/* Video Player Placeholder Mock */}
      <div style={{
        aspectRatio: '16 / 9',
        backgroundColor: '#0F172A',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
          cursor: 'pointer'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Video Stream Engine (MinIO Chunk S3 Stream Pipeline - Phase 4)
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-indigo">{video.category || 'General'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{video.views} views</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>•</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Uploaded {formatDate(video.created_at)}</span>
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>{video.title}</h1>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          lineHeight: 1.6
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Metadata & Description</h4>
          <p style={{ marginBottom: '1rem' }}>{video.description || 'No description provided.'}</p>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <span><strong>Duration:</strong> {formatDuration(video.duration)}</span>
            <span><strong>File Size:</strong> {formatFileSize(video.file_size)}</span>
            <span><strong>Storage Key:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{video.storage_key}</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
