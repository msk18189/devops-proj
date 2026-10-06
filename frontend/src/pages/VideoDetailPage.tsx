import { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { formatDate, formatFileSize, formatDuration } from '../utils/formatters.ts';

interface VideoDetailPageProps {
  video?: Video | null;
  videoId?: number | null;
  onSelectRelated: (video: Video) => void;
  onBack: () => void;
}

export function VideoDetailPage({ video, videoId, onSelectRelated, onBack }: VideoDetailPageProps) {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(video || null);
  const [loading, setLoading] = useState<boolean>(!video && !!videoId);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showShareToast, setShowShareToast] = useState<boolean>(false);

  // If video object changed from props
  useEffect(() => {
    if (video) {
      setCurrentVideo(video);
      setLoading(false);
      setFetchError(null);
    } else if (videoId) {
      setLoading(true);
      setFetchError(null);
      videoService.getVideoById(videoId)
        .then(data => {
          setCurrentVideo(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load video:', err);
          setFetchError(err instanceof Error ? err.message : 'Video not found or unavailable.');
          setLoading(false);
        });
    }
  }, [video, videoId]);

  // Load related videos
  useEffect(() => {
    if (!currentVideo) return;
    setIsLiked(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    videoService.getVideos({
      category: currentVideo.category,
      pageSize: 6
    }).then(res => {
      const filtered = (res.items || []).filter(v => v.id !== currentVideo.id);
      setRelatedVideos(filtered);
    }).catch(err => {
      console.warn('Could not fetch related videos:', err);
    });
  }, [currentVideo?.id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p>Loading video and stream configuration...</p>
      </div>
    );
  }

  if (fetchError || !currentVideo) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#EF4444' }}>
          Video Unavailable
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {fetchError || 'The requested video could not be found or has been removed.'}
        </p>
        <button onClick={onBack} className="btn btn-primary">
          Back to Browse
        </button>
      </div>
    );
  }

  const creatorName = currentVideo.creator?.name || 'Content Creator';

  return (
    <div style={{ padding: '1.5rem 0 4rem 0' }}>
      <button
        onClick={onBack}
        className="btn btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
      >
        ← Back to Catalog
      </button>

      <div className="details-grid">
        {/* Main Column */}
        <div>
          {/* HTML5 Video Player */}
          <VideoPlayer
            video={currentVideo}
            onViewIncremented={(newViews) => {
              setCurrentVideo(prev => prev ? { ...prev, views: newViews } : null);
            }}
          />

          {/* Video Metadata Header */}
          <div style={{ marginTop: '1.25rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '0.75rem' }}>
              {currentVideo.title}
            </h1>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              {/* Creator & Stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#FFFFFF'
                }}>
                  {creatorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.95rem' }}>{creatorName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{currentVideo.views.toLocaleString()} views</span>
                    <span style={{ margin: '0 0.4rem' }}>•</span>
                    <span>{formatDate(currentVideo.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', position: 'relative' }}>
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: isLiked ? 'var(--accent-primary)' : 'inherit',
                    borderColor: isLiked ? 'var(--accent-primary)' : 'var(--border-subtle)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  <span>Share</span>
                </button>

                {showShareToast && (
                  <div style={{
                    position: 'absolute',
                    top: '-36px',
                    right: '0',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    whiteSpace: 'nowrap'
                  }}>
                    Link copied to clipboard!
                  </div>
                )}
              </div>
            </div>

            {/* Description & Technical Metadata */}
            <div style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.825rem' }}>
                <span className="badge" style={{ backgroundColor: 'var(--bg-card)' }}>{currentVideo.category}</span>
                <span style={{ color: 'var(--text-muted)' }}>Duration: {formatDuration(currentVideo.duration)}</span>
                <span style={{ color: 'var(--text-muted)' }}>Size: {formatFileSize(currentVideo.file_size)}</span>
                <span style={{ color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>Storage: MinIO S3 Object</span>
              </div>

              <p style={{
                color: 'var(--text-normal)',
                lineHeight: 1.6,
                fontSize: '0.925rem',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {currentVideo.description || 'No description provided by creator.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar: Related Videos */}
        <aside>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Related in {currentVideo.category}</span>
          </h2>

          {relatedVideos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No other videos in this category yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {relatedVideos.map(item => (
                <div key={item.id} onClick={() => onSelectRelated(item)} style={{ cursor: 'pointer' }}>
                  <VideoCard video={item} onSelect={onSelectRelated} />
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
