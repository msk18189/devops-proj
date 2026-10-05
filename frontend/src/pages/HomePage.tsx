import { useState } from 'react';
import { useVideos } from '../hooks/useVideos.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { Video } from '../types/index.ts';

interface HomePageProps {
  onSelectVideo: (video: Video) => void;
}

export function HomePage({ onSelectVideo }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'DevOps', 'Kubernetes', 'Cloud Architecture', 'Databases', 'Monitoring'];

  const categoryQuery = selectedCategory === 'All' ? undefined : selectedCategory;
  const { videos, isLoading, error } = useVideos(1, categoryQuery);

  return (
    <div style={{ padding: '2rem 0 4rem 0' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem auto' }}>
        <div style={{ display: 'inline-block', marginBottom: '1rem' }}>
          <span className="badge badge-indigo">StreamOps v1.0.0 Architecture</span>
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1.2rem' }}>
          Production DevOps for High-Throughput Video Streaming
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Explore distributed microservice streaming backed by FastAPI, PostgreSQL, Kubernetes HPA auto-scaling, and Prometheus telemetry.
        </p>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2rem', justifyContent: 'center' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Catalog */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>Connecting to backend database...</p>
        </div>
      ) : error ? (
        <div className="error-banner" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
          <p style={{ fontWeight: 600 }}>Backend Notice</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
        </div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }}>
            <rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No videos in catalog</h3>
          <p style={{ fontSize: '0.9rem' }}>Database is online. Videos will appear when uploaded or seeded.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
          ))}
        </div>
      )}
    </div>
  );
}
