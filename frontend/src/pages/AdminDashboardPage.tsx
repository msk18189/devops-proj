import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { adminService } from '../services/adminService.ts';
import { videoService } from '../services/videoService.ts';
import { AdminDashboardData, Video } from '../types/index.ts';

interface AdminDashboardPageProps {
  onSelectVideo: (video: Video) => void;
}

export function AdminDashboardPage({ onSelectVideo }: AdminDashboardPageProps) {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Video moderation state
  const [videos, setVideos] = useState<Video[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, videoListRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAdminVideos(1, 20)
      ]);
      setData(statsRes);
      setVideos(videoListRes.items);
    } catch (err: unknown) {
      console.error('Failed to load admin stats:', err);
      setError(err instanceof Error ? err.message : 'Could not fetch admin operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchDashboardData();
    }
  }, [user]);

  const handleDeleteVideo = async (videoId: number, title: string) => {
    if (!window.confirm(`Admin Action: Permanently delete "${title}"? This deletes both the MinIO storage object and PostgreSQL record.`)) {
      return;
    }

    try {
      setDeletingId(videoId);
      setDeleteError(null);
      await videoService.deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      // Refresh stats
      const statsRes = await adminService.getDashboardStats();
      setData(statsRes);
    } catch (err: unknown) {
      console.error('Admin delete failed:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete video.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444', marginBottom: '0.75rem' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          You must be an authenticated Administrator to access the operations dashboard.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Admin Operations Dashboard
            </h1>
            <span style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              ADMIN ROLE
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live platform metrics, PostgreSQL database health, and MinIO object storage content moderation.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh Data
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #EF4444',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '2rem',
          color: '#F87171'
        }}>
          {error}
        </div>
      )}

      {deleteError && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #EF4444',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#F87171',
          fontSize: '0.9rem'
        }}>
          {deleteError}
        </div>
      )}

      {loading && !data ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Querying PostgreSQL & MinIO operational statistics...</p>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            {/* Total Users */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Users</span>
                <span style={{ color: '#3B82F6' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
                {data.metrics.total_users.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Registered database accounts
              </div>
            </div>

            {/* Total Videos */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Videos</span>
                <span style={{ color: 'var(--accent-primary)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
                {data.metrics.total_videos.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Indexed in MinIO / PostgreSQL
              </div>
            </div>

            {/* Total Views */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Stream Views</span>
                <span style={{ color: '#10B981' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
                {data.metrics.total_views.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                {data.metrics.total_view_events} logged playback sessions
              </div>
            </div>

            {/* Backend & DB Health */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>System Health</span>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: data.system_health.status === 'operational' ? '#10B981' : '#F59E0B'
                }}></span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'capitalize' }}>
                {data.system_health.status}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                PostgreSQL: {data.system_health.database}
              </div>
            </div>
          </div>

          {/* Video Moderation Table */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Content Moderation & Catalog</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                  Administrators have system authority to delete any video across the entire catalog.
                </p>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {videos.length} videos shown
              </span>
            </div>

            {videos.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No uploaded videos found in the database.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderBottom: '1px solid var(--border-subtle)',
                      textAlign: 'left',
                      color: 'var(--text-muted)'
                    }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Video</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Creator</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Views</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Size</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Uploaded</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(video => (
                      <tr
                        key={video.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#FFFFFF', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {video.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                            ID: {video.id}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            {video.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {video.creator ? (
                            <div>
                              <div>{video.creator.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{video.creator.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-subtle)' }}>User #{video.uploaded_by}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#10B981', fontWeight: 600 }}>
                          {video.views.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                          {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(video.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => onSelectVideo(video)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Watch
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id, video.title)}
                              disabled={deletingId === video.id}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#EF4444',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: deletingId === video.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {deletingId === video.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
