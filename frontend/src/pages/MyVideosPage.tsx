import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { videoService } from '../services/videoService.ts';
import { Video } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { SkeletonGrid } from '../components/SkeletonGrid.tsx';

interface MyVideosPageProps {
  onSelectVideo: (video: Video) => void;
  onNavigateUpload: () => void;
}

export function MyVideosPage({ onSelectVideo, onNavigateUpload }: MyVideosPageProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchMyVideos = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await videoService.getVideos({
        userId: user.id,
        pageSize: 50,
        sort: 'latest'
      });
      setVideos(res.items);
    } catch (err: unknown) {
      console.error('Failed to load user videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve your videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVideos();
  }, [user]);

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await videoService.deleteVideo(videoToDelete.id);
      // Remove from list
      setVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
      setVideoToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete video:', err);
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the video from storage.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Authentication Required</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please log in to manage your uploaded videos.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            My Videos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage and monitor your uploaded media catalog ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
          </p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Upload New Video
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ color: '#F87171', margin: 0, fontSize: '0.95rem' }}>{error}</p>
          <button onClick={fetchMyVideos} className="btn btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && <SkeletonGrid count={6} />}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '540px',
          margin: '2rem auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            color: 'var(--text-subtle)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            You haven't uploaded any videos yet.
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Share high-definition content with your audience. Videos are securely stored in MinIO S3 object storage and streamed on-demand.
          </p>
          <button onClick={onNavigateUpload} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            Upload Your First Video
          </button>
        </div>
      )}

      {/* Video Grid with Delete Action */}
      {!loading && !error && videos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {videos.map(video => (
            <div
              key={video.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                transition: 'border-color var(--transition-fast)'
              }}
            >
              <div style={{ cursor: 'pointer' }} onClick={() => onSelectVideo(video)}>
                <VideoCard video={video} onSelect={onSelectVideo} />
              </div>

              {/* Action Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 0.9rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(0,0,0,0.2)'
              }}>
                <button
                  onClick={() => onSelectVideo(video)}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Watch
                </button>

                <button
                  onClick={() => setVideoToDelete(video)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.borderColor = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#FFFFFF' }}>
              Delete Video
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong style={{ color: '#FFFFFF' }}>"{videoToDelete.title}"</strong>?
              This will remove the media binary from MinIO object storage and delete its PostgreSQL metadata record.
            </p>

            {deleteError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: '#F87171',
                fontSize: '0.85rem'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setVideoToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1.1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting from MinIO...' : 'Yes, Delete Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
