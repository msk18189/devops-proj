import { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { SkeletonGrid } from '../components/SkeletonGrid.tsx';

interface BrowsePageProps {
  initialCategory?: string;
  onSelectVideo: (video: Video) => void;
}

export function BrowsePage({ initialCategory = 'All', onSelectVideo }: BrowsePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortOrder, setSortOrder] = useState<string>('latest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'All',
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
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setPage(1);
    }
  }, [initialCategory]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await videoService.getVideos({
          page,
          pageSize: 12,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          sort: sortOrder,
          search: searchTerm.trim() || undefined
        });

        setVideos(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load videos from catalog');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCatalog();
  }, [selectedCategory, sortOrder, page, searchTerm]);

  return (
    <div style={{ padding: '2rem 0 4rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Browse Catalog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Showing {total} {total === 1 ? 'video' : 'videos'}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Filter title..."
            style={{ width: '220px', padding: '0.45rem 0.8rem' }}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
            <select
              className="form-control"
              style={{ width: '130px', padding: '0.45rem 0.6rem' }}
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="latest">Latest</option>
              <option value="popular">Most Viewed</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="category-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setPage(1);
            }}
            className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

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

      {/* Catalog Grid */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : videos.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          margin: '2rem 0'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" style={{ margin: '0 auto 1rem auto' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No videos found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            No media matching category "{selectedCategory}" or search terms. Try selecting another genre.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchTerm('');
              setPage(1);
            }}
            className="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary"
                style={{ opacity: page <= 1 ? 0.5 : 1 }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary"
                style={{ opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
