import { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { SkeletonGrid } from '../components/SkeletonGrid.tsx';
import { formatDate } from '../utils/formatters.ts';

interface HomePageProps {
  onSelectVideo: (video: Video) => void;
  onNavigateBrowse: (category?: string) => void;
}

export function HomePage({ onSelectVideo, onNavigateBrowse }: HomePageProps) {
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Technology',
    'Education',
    'Entertainment',
    'Gaming',
    'Science',
    'Travel',
    'Music',
    'Documentary'
  ];

  useEffect(() => {
    const loadHomeData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [popularRes, latestRes] = await Promise.all([
          videoService.getVideos({ sort: 'popular', pageSize: 6 }),
          videoService.getVideos({ sort: 'latest', pageSize: 8 })
        ]);

        const trending = popularRes.items || [];
        const latest = latestRes.items || [];

        setTrendingVideos(trending);
        setRecentVideos(latest);

        // Pick top trending or top latest as featured
        if (trending.length > 0) {
          setFeaturedVideo(trending[0]);
        } else if (latest.length > 0) {
          setFeaturedVideo(latest[0]);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to connect to video catalog.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
      {featuredVideo && (
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-tag">Featured Video • {featuredVideo.category}</span>
            <h1 className="hero-title">{featuredVideo.title}</h1>
            <p className="hero-desc">{featuredVideo.description || 'Watch now on StreamOps high-throughput streaming platform.'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => onSelectVideo(featuredVideo)}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Watch Now
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {featuredVideo.views.toLocaleString()} views • {formatDate(featuredVideo.created_at)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Category Pills Bar */}
      <section style={{ margin: '1.5rem 0' }}>
        <div className="category-bar">
          <button
            onClick={() => onNavigateBrowse('All')}
            className="category-chip active"
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onNavigateBrowse(cat)}
              className="category-chip"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.5rem',
          color: '#F87171',
          marginBottom: '2rem'
        }}>
          {error}
        </div>
      )}

      {/* Trending Now */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Trending Now</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.15rem' }}>Most viewed streaming media across all genres</p>
          </div>
          <button
            onClick={() => onNavigateBrowse('All')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}
          >
            View All →
          </button>
        </div>

        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : trendingVideos.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <p>No trending videos available yet. Be the first to upload!</p>
          </div>
        ) : (
          <div className="video-grid">
            {trendingVideos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Uploaded */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Recently Uploaded</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.15rem' }}>Freshly published content from creators</p>
          </div>
          <button
            onClick={() => onNavigateBrowse('All')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}
          >
            View All →
          </button>
        </div>

        {isLoading ? (
          <SkeletonGrid count={8} />
        ) : recentVideos.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <p>No recent uploads found in the catalog.</p>
          </div>
        ) : (
          <div className="video-grid">
            {recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
